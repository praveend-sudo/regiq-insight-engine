import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { describeDocs, type LinkedDoc } from "@/lib/doc-library";

const linkedDocSchema = z.object({
  id: z.string(),
  type: z.enum(["external", "internal"]),
  issuer: z.string(),
  title: z.string(),
  section: z.string().optional(),
});

export type MemoRow = {
  id: string;
  user_id: string;
  title: string;
  change_summary: string | null;
  issuer: string | null;
  body: string;
  recipient_email: string | null;
  status: "draft" | "sent";
  sent_at: string | null;
  linked_docs: LinkedDoc[];
  source_notification_id: string | null;
  follow_up_date: string | null;
  remind_days_before: number;
  reminded_at: string | null;
  created_at: string;
  updated_at: string;
};

export const listMemos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("memos")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as MemoRow[];
  });

/** Draft an internal memo about a regulatory change using Lovable AI. */
export const generateMemo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        change: z.string().min(3).max(4000),
        issuer: z.string().max(120).optional(),
        audience: z.string().max(200).optional(),
        linked_docs: z.array(linkedDocSchema).max(30).optional(),
        source_notification_id: z.string().uuid().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { callGatewayJSON } = await import("@/lib/ai-gateway.server");
    const result = await callGatewayJSON<{ title: string; body: string }>({
      messages: [
        {
          role: "system",
          content:
            "You are a Sri Lankan financial-services compliance officer drafting an internal memorandum about a regulatory change. Regulators of interest: CBSL, SEC Sri Lanka, CSE, IRD. Respond ONLY with JSON: {\"title\": string, \"body\": string}. The body is a complete plain-text memo with To/From/Date/Subject headers, a background paragraph, 'Key changes' bullets, 'Impact on our institution' bullets, 'Required actions and owners' bullets with indicative deadlines, and a closing line. Be specific, professional and concise (350-500 words).",
        },
        {
          role: "user",
          content: `Regulatory change: ${data.change}\nIssuer: ${data.issuer ?? "unspecified"}\nAudience: ${data.audience ?? "Senior Management and Compliance Committee"}${
            data.linked_docs?.length
              ? `\n\nReference these linked documents explicitly in the memo (cite issuer, title and section):\n${describeDocs(data.linked_docs)}`
              : ""
          }`,
        },
      ],
    });

    const { data: row, error } = await context.supabase
      .from("memos")
      .insert({
        user_id: context.userId,
        title: result.title?.slice(0, 300) || "Regulatory change memo",
        change_summary: data.change,
        issuer: data.issuer ?? null,
        body: result.body ?? "",
        linked_docs: (data.linked_docs ?? []) as unknown as never,
        source_notification_id: data.source_notification_id ?? null,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row as unknown as MemoRow;
  });

export const updateMemo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        title: z.string().min(1).max(300).optional(),
        body: z.string().max(40000).optional(),
        recipient_email: z.string().email().nullable().optional(),
        status: z.enum(["draft", "sent"]).optional(),
        sent_at: z.string().nullable().optional(),
        linked_docs: z.array(linkedDocSchema).max(30).optional(),
        follow_up_date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .nullable()
          .optional(),
        remind_days_before: z.number().int().min(0).max(120).optional(),
        reminded_at: z.string().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { id, ...rest } = data;
    const { data: row, error } = await context.supabase
      .from("memos")
      .update(rest)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row as unknown as MemoRow;
  });

export const deleteMemo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("memos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Raises in-app "reminder" notifications for memos that are still unsent and
 * whose follow-up date falls inside their configured reminder window.
 * Returns the memos that also need an email nudge.
 */
export const runMemoReminderSweep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const now = new Date();
    const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const days = (a: string, b: string) =>
      Math.round(
        (new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime()) / 86400000,
      );

    const { data, error } = await supabase
      .from("memos")
      .select("*")
      .eq("status", "draft")
      .not("follow_up_date", "is", null);
    if (error) throw new Error(error.message);

    const emailQueue: Array<{
      kind: "memo";
      id: string;
      title: string;
      dueDate: string;
      recipients: string[];
      body: string;
    }> = [];

    for (const raw of (data ?? []) as unknown as MemoRow[]) {
      const due = raw.follow_up_date as string;
      const delta = days(todayISO, due);
      if (delta > (raw.remind_days_before ?? 3)) continue;
      if (raw.reminded_at) continue;

      await supabase.from("notifications").insert({
        user_id: userId,
        title:
          delta < 0
            ? `Overdue memo: ${raw.title}`
            : `Memo due ${delta === 0 ? "today" : `in ${delta} day(s)`}: ${raw.title}`,
        summary:
          raw.change_summary ??
          `This memo is still in draft and needs to be circulated by ${due}.`,
        impact: delta < 0 ? "high" : "medium",
        issuer: raw.issuer ?? "RegIQ",
        category: "reminder",
        linked: [],
        ai_insight: null,
      });
      await supabase.from("memos").update({ reminded_at: new Date().toISOString() }).eq("id", raw.id);

      emailQueue.push({
        kind: "memo",
        id: raw.id,
        title: raw.title,
        dueDate: due,
        recipients: raw.recipient_email ? [raw.recipient_email] : [],
        body: `Reminder: the memo "${raw.title}" is still a draft and is due on ${due}.\n\n${raw.body}`,
      });
    }

    return { created: emailQueue.length, emailQueue };
  });
