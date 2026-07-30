import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { advance, type ObligationRow } from "@/lib/schedule";

export const listObligations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("compliance_obligations")
      .select("*")
      .order("next_due_date", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as ObligationRow[];
  });

export const createObligation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        title: z.string().min(1).max(300),
        description: z.string().max(4000).optional().nullable(),
        source_type: z.enum(["internal", "external"]),
        issuer: z.string().max(120).optional().nullable(),
        audience: z.enum(["regulator", "internal"]),
        frequency: z.enum(["one_off", "monthly", "quarterly", "half_yearly", "annual"]),
        next_due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        lead_days: z.number().int().min(0).max(120),
        recipients: z.array(z.string().email()).max(20),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("compliance_obligations")
      .insert({ ...data, user_id: context.userId })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row as unknown as ObligationRow;
  });

export const updateObligation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        title: z.string().min(1).max(300).optional(),
        description: z.string().max(4000).nullable().optional(),
        source_type: z.enum(["internal", "external"]).optional(),
        issuer: z.string().max(120).nullable().optional(),
        audience: z.enum(["regulator", "internal"]).optional(),
        frequency: z.enum(["one_off", "monthly", "quarterly", "half_yearly", "annual"]).optional(),
        next_due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        lead_days: z.number().int().min(0).max(120).optional(),
        recipients: z.array(z.string().email()).max(20).optional(),
        active: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { id, ...rest } = data;
    const { data: row, error } = await context.supabase
      .from("compliance_obligations")
      .update(rest)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row as unknown as ObligationRow;
  });

export const deleteObligation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("compliance_obligations")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Mark the current cycle as filed and roll the due date to the next period. */
export const completeObligation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: cur, error: e1 } = await context.supabase
      .from("compliance_obligations")
      .select("*")
      .eq("id", data.id)
      .single();
    if (e1) throw new Error(e1.message);
    const ob = cur as unknown as ObligationRow;
    const next = advance(ob.next_due_date, ob.frequency);
    const patch =
      ob.frequency === "one_off"
        ? { active: false, last_completed_at: new Date().toISOString() }
        : { next_due_date: next, last_completed_at: new Date().toISOString(), reminded_for: null };
    const { data: row, error } = await context.supabase
      .from("compliance_obligations")
      .update(patch)
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row as unknown as ObligationRow;
  });

/**
 * Creates in-app reminder notifications for tasks and obligations that are due
 * inside their reminder window, and returns the items that still need an email.
 */
export const runReminderSweep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const today = new Date();
    const iso = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const todayISO = iso(today);
    const days = (a: string, b: string) =>
      Math.round(
        (new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime()) / 86400000,
      );

    const emailQueue: Array<{
      kind: "task" | "obligation";
      id: string;
      title: string;
      dueDate: string;
      recipients: string[];
      body: string;
    }> = [];

    // --- Tasks with a target completion date ---
    const { data: tasks } = await supabase
      .from("tasks")
      .select("id, title, description, due_date, status, reminded_at, assigned_to, user_id")
      .or(`user_id.eq.${userId},assigned_to.eq.${userId}`)
      .not("due_date", "is", null)
      .neq("status", "done");

    for (const t of tasks ?? []) {
      const due = t.due_date as string;
      const delta = days(todayISO, due);
      if (delta > 3) continue;
      if (t.reminded_at) continue;
      await supabase.from("notifications").insert({
        user_id: userId,
        title: delta < 0 ? `Overdue task: ${t.title}` : `Task due ${delta === 0 ? "today" : `in ${delta} day(s)`}: ${t.title}`,
        summary: t.description ?? "Target completion date is approaching.",
        impact: delta < 0 ? "high" : "medium",
        issuer: "RegIQ",
        linked: [],
        ai_insight: null,
      });
      await supabase.from("tasks").update({ reminded_at: new Date().toISOString() }).eq("id", t.id);
      emailQueue.push({
        kind: "task",
        id: t.id,
        title: t.title,
        dueDate: due,
        recipients: [],
        body: `Task "${t.title}" is due on ${due}.\n\n${t.description ?? ""}`,
      });
    }

    // --- Recurring reporting obligations ---
    const { data: obs } = await supabase
      .from("compliance_obligations")
      .select("*")
      .eq("active", true);

    for (const raw of obs ?? []) {
      const ob = raw as unknown as ObligationRow;
      const delta = days(todayISO, ob.next_due_date);
      if (delta > ob.lead_days) continue;
      if (ob.reminded_for === ob.next_due_date) continue;
      await supabase.from("notifications").insert({
        user_id: userId,
        title:
          delta < 0
            ? `Overdue submission: ${ob.title}`
            : `${ob.audience === "regulator" ? "Regulatory" : "Internal"} report due ${delta === 0 ? "today" : `in ${delta} day(s)`}: ${ob.title}`,
        summary: ob.description ?? `Scheduled ${ob.frequency.replace("_", "-")} submission due ${ob.next_due_date}.`,
        impact: ob.audience === "regulator" ? "high" : "medium",
        issuer: ob.issuer ?? "RegIQ",
        linked: [],
        ai_insight: null,
      });
      await supabase
        .from("compliance_obligations")
        .update({ reminded_for: ob.next_due_date })
        .eq("id", ob.id);
      emailQueue.push({
        kind: "obligation",
        id: ob.id,
        title: ob.title,
        dueDate: ob.next_due_date,
        recipients: ob.recipients ?? [],
        body: `Reminder: "${ob.title}" (${ob.audience === "regulator" ? "regulator submission" : "internal report"}) is due on ${ob.next_due_date}.\n\n${ob.description ?? ""}`,
      });
    }

    return { created: emailQueue.length, emailQueue };
  });
