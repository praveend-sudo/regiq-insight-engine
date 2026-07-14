import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

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
  }) =>
    z
      .object({
        title: z.string().min(1).max(300),
        description: z.string().max(4000).optional(),
        source_question: z.string().max(2000).optional(),
        source_answer: z.string().max(6000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("tasks")
      .insert({ ...data, user_id: userId })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row as TaskRow;
  });

// UPDATE (status / remarks / title / description)
export const updateTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    id: string;
    status?: (typeof STATUSES)[number];
    remarks?: string | null;
    title?: string;
    description?: string | null;
  }) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(STATUSES).optional(),
        remarks: z.string().max(4000).nullable().optional(),
        title: z.string().min(1).max(300).optional(),
        description: z.string().max(4000).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { id, ...rest } = data;
    const { data: row, error } = await supabase
      .from("tasks")
      .update(rest)
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
      const { data: found, error: rpcErr } = await supabase.rpc(
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
export type FlaggedRow = {
  id: string;
  user_id: string;
  question: string;
  summary: string;
  bullets: string[];
  citations: unknown[];
  confidence: number | null;
  note: string | null;
  created_at: string;
};

export const listFlagged = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("flagged_answers")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as FlaggedRow[];
  });

export const createFlagged = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    question: string;
    summary: string;
    bullets: string[];
    citations: unknown[];
    confidence?: number;
    note?: string;
  }) =>
    z
      .object({
        question: z.string().min(1).max(2000),
        summary: z.string().min(1).max(6000),
        bullets: z.array(z.string()).max(30),
        citations: z.array(z.unknown()).max(30),
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
    return row as FlaggedRow;
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
