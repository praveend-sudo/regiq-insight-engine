import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { ChatTurn } from "@/lib/mock-data";

export type ProjectRow = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type ChatRow = {
  id: string;
  user_id: string;
  project_id: string | null;
  title: string;
  created_at: string;
  updated_at: string;
};

// -------- Projects --------
export const listProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as ProjectRow[];
  });

export const createProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { name: string; description?: string }) =>
    z.object({ name: z.string().min(1).max(120), description: z.string().max(1000).optional() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("projects")
      .insert({ name: data.name, description: data.description ?? null, user_id: context.userId })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row as ProjectRow;
  });

export const updateProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; name?: string; description?: string | null }) =>
    z.object({
      id: z.string().uuid(),
      name: z.string().min(1).max(120).optional(),
      description: z.string().max(1000).nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { id, ...rest } = data;
    const { data: row, error } = await context.supabase
      .from("projects").update(rest).eq("id", id).select("*").single();
    if (error) throw new Error(error.message);
    return row as ProjectRow;
  });

export const deleteProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("projects").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------- Chats --------
export const listChats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("chats")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as ChatRow[];
  });

export const createChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { title?: string; project_id?: string | null }) =>
    z.object({
      title: z.string().min(1).max(200).optional(),
      project_id: z.string().uuid().nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("chats")
      .insert({
        title: data.title ?? "New chat",
        project_id: data.project_id ?? null,
        user_id: context.userId,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row as ChatRow;
  });

export const renameChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; title: string; project_id?: string | null }) =>
    z.object({
      id: z.string().uuid(),
      title: z.string().min(1).max(200),
      project_id: z.string().uuid().nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { id, ...rest } = data;
    const { data: row, error } = await context.supabase
      .from("chats").update(rest).eq("id", id).select("*").single();
    if (error) throw new Error(error.message);
    return row as ChatRow;
  });

export const deleteChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("chats").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const moveChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; project_id: string | null }) =>
    z.object({ id: z.string().uuid(), project_id: z.string().uuid().nullable() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("chats").update({ project_id: data.project_id }).eq("id", data.id).select("*").single();
    if (error) throw new Error(error.message);
    return row as ChatRow;
  });

// -------- Messages --------
export const getChatTurns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { chat_id: string }) => z.object({ chat_id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from("chat_messages")
      .select("*")
      .eq("chat_id", data.chat_id)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => ({
      id: r.id,
      role: r.role,
      content: r.content,
      created_at: r.created_at,
    }));
  });

export const appendChatTurn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { chat_id: string; turn: ChatTurn }) =>
    z.object({
      chat_id: z.string().uuid(),
      turn: z.object({
        id: z.string(),
        question: z.string(),
        answer: z.any(),
      }),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { chat_id, turn } = data;
    const { error: e1 } = await context.supabase.from("chat_messages").insert([
      { chat_id, user_id: context.userId, role: "user", content: { text: turn.question } },
      { chat_id, user_id: context.userId, role: "assistant", content: turn.answer as never },
    ]);
    if (e1) throw new Error(e1.message);
    await context.supabase.from("chats").update({ updated_at: new Date().toISOString() }).eq("id", chat_id);
    return { ok: true };
  });
