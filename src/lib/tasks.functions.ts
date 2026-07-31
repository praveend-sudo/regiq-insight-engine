import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { LinkedDoc } from "@/lib/doc-library";

const linkedDocSchema = z.object({
  id: z.string(),
  type: z.enum(["external", "internal"]),
  issuer: z.string(),
  title: z.string(),
  section: z.string().optional(),
});

const STATUSES = ["open", "in_progress", "done"] as const;

export type TaskRow = {
  id: string;
  user_id: string;
  assigned_to: string | null;
  title: string;
  description: string | null;
  source_question: string | null;
  source_answer: string | null;
  status: (typeof STATUSES)[number];
  remarks: string | null;
  due_date: string | null;
  reminded_at: string | null;
  remind_days_before: number;
  linked_docs: LinkedDoc[];
  created_at: string;
  updated_at: string;
  assignee_name?: string | null;
  creator_name?: string | null;
};


// LIST tasks (owned or assigned to me)
export const listTasks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .or(`user_id.eq.${userId},assigned_to.eq.${userId}`)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as TaskRow[];

    // Enrich with names
    const ids = Array.from(
      new Set(
        rows.flatMap((r) => [r.user_id, r.assigned_to].filter(Boolean) as string[]),
      ),
    );
    if (ids.length === 0) return rows;
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", ids);
    const map = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
    return rows.map((r) => ({
      ...r,
      creator_name: map.get(r.user_id) ?? null,
      assignee_name: r.assigned_to ? map.get(r.assigned_to) ?? null : null,
    }));
  });

// CREATE
export const createTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    title: string;
    description?: string;
    source_question?: string;
    source_answer?: string;
    due_date?: string | null;
    remind_days_before?: number;
    linked_docs?: LinkedDoc[];
    assignee_email?: string | null;
  }) =>
    z
      .object({
        title: z.string().min(1).max(300),
        description: z.string().max(4000).optional(),
        source_question: z.string().max(2000).optional(),
        source_answer: z.string().max(6000).optional(),
        due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
        remind_days_before: z.number().int().min(0).max(120).optional(),
        linked_docs: z.array(linkedDocSchema).max(30).optional(),
        assignee_email: z.string().email().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { assignee_email, linked_docs, ...rest } = data;
    let assignedTo: string | null = null;
    if (assignee_email) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: found, error: rpcErr } = await supabaseAdmin.rpc("find_user_id_by_email", {
        _email: assignee_email,
      });
      if (rpcErr) throw new Error(rpcErr.message);
      if (!found) throw new Error(`No user found with email ${assignee_email}`);
      assignedTo = found as string;
    }
    const { data: row, error } = await supabase
      .from("tasks")
      .insert({
        ...rest,
        linked_docs: (linked_docs ?? []) as unknown as never,
        assigned_to: assignedTo,
        user_id: userId,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row as TaskRow;
  });

// UPDATE (status / remarks / title / description / due date)
export const updateTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    id: string;
    status?: (typeof STATUSES)[number];
    remarks?: string | null;
    title?: string;
    description?: string | null;
    due_date?: string | null;
    remind_days_before?: number;
    linked_docs?: LinkedDoc[];
  }) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(STATUSES).optional(),
        remarks: z.string().max(4000).nullable().optional(),
        title: z.string().min(1).max(300).optional(),
        description: z.string().max(4000).nullable().optional(),
        due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
        remind_days_before: z.number().int().min(0).max(120).optional(),
        linked_docs: z.array(linkedDocSchema).max(30).optional(),
      })
      .parse(d),
  )

  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { id, ...rest } = data;
    const patch = { ...rest } as Record<string, unknown>;
    // Re-arm the reminder whenever the schedule changes.
    if (rest.due_date !== undefined || rest.remind_days_before !== undefined) patch.reminded_at = null;
    const { data: row, error } = await supabase
      .from("tasks")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row as TaskRow;
  });

// DELETE
export const deleteTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("tasks").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ASSIGN by email
export const assignTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; email: string | null }) =>
    z
      .object({
        id: z.string().uuid(),
        email: z.string().email().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    let assignedTo: string | null = null;
    if (data.email) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: found, error: rpcErr } = await supabaseAdmin.rpc(
        "find_user_id_by_email",
        { _email: data.email },
      );
      if (rpcErr) throw new Error(rpcErr.message);
      if (!found) throw new Error(`No user found with email ${data.email}`);
      assignedTo = found as string;
    }
    const { data: row, error } = await supabase
      .from("tasks")
      .update({ assigned_to: assignedTo })
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row as TaskRow;
  });

// FLAGGED ANSWERS
export type FlaggedCitation = {
  id: string;
  type: string;
  issuer: string;
  title: string;
  section: string;
  date: string;
  relevance: number;
  excerpt: string;
};

export type FlaggedRow = {
  id: string;
  user_id: string;
  question: string;
  summary: string;
  bullets: string[];
  citations: FlaggedCitation[];
  confidence: number | null;
  note: string | null;
  created_at: string;
};

const flaggedCitationSchema = z.object({
  id: z.string(),
  type: z.string(),
  issuer: z.string(),
  title: z.string(),
  section: z.string(),
  date: z.string(),
  relevance: z.number(),
  excerpt: z.string(),
});

export const listFlagged = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("flagged_answers")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as FlaggedRow[];
  });

export const createFlagged = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    question: string;
    summary: string;
    bullets: string[];
    citations: FlaggedCitation[];
    confidence?: number;
    note?: string;
  }) =>
    z
      .object({
        question: z.string().min(1).max(2000),
        summary: z.string().min(1).max(6000),
        bullets: z.array(z.string()).max(30),
        citations: z.array(flaggedCitationSchema).max(30),
        confidence: z.number().min(0).max(100).optional(),
        note: z.string().max(2000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("flagged_answers")
      .insert({ ...data, user_id: context.userId })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row as unknown as FlaggedRow;
  });

export const deleteFlagged = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("flagged_answers")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

