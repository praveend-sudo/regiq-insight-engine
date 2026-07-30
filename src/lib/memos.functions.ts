import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

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
          content: `Regulatory change: ${data.change}\nIssuer: ${data.issuer ?? "unspecified"}\nAudience: ${data.audience ?? "Senior Management and Compliance Committee"}`,
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
