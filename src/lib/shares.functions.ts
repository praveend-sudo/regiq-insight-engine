import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type ShareRow = {
  id: string;
  chat_id: string;
  shared_with: string;
  shared_by: string;
  permission: "view" | "edit";
  created_at: string;
  recipient_email?: string | null;
  recipient_name?: string | null;
};

export const listSharesForChat = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { chat_id: string }) =>
    z.object({ chat_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from("chat_shares")
      .select("*")
      .eq("chat_id", data.chat_id)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    const ids = (rows ?? []).map((r) => r.shared_with);
    const info: Record<string, { email: string | null; full_name: string | null }> = {};
    if (ids.length) {
      const { data: profs } = await context.supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", ids);
      for (const p of profs ?? []) info[p.id] = { email: null, full_name: p.full_name };
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      for (const uid of ids) {
        const { data: u } = await supabaseAdmin.auth.admin.getUserById(uid);
        if (u?.user?.email) {
          info[uid] = { email: u.user.email, full_name: info[uid]?.full_name ?? null };
        }
      }
    }
    return (rows ?? []).map((r) => ({
      ...r,
      recipient_email: info[r.shared_with]?.email ?? null,
      recipient_name: info[r.shared_with]?.full_name ?? null,
    })) as ShareRow[];

  });

export const shareChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { chat_id: string; email: string; permission: "view" | "edit" }) =>
    z
      .object({
        chat_id: z.string().uuid(),
        email: z.string().email(),
        permission: z.enum(["view", "edit"]),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    // Verify caller owns the chat
    const { data: chat, error: chatErr } = await context.supabase
      .from("chats")
      .select("id, user_id")
      .eq("id", data.chat_id)
      .single();
    if (chatErr || !chat) throw new Error("Chat not found");
    if (chat.user_id !== context.userId) throw new Error("Only the chat owner can share it");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: uid, error: rpcErr } = await supabaseAdmin.rpc("find_user_id_by_email", {
      _email: data.email,
    });
    if (rpcErr) throw new Error(rpcErr.message);
    if (!uid) throw new Error("No user found with that email");
    if (uid === context.userId) throw new Error("You already own this chat");

    const { data: row, error } = await context.supabase
      .from("chat_shares")
      .upsert(
        {
          chat_id: data.chat_id,
          shared_with: uid as string,
          shared_by: context.userId,
          permission: data.permission,
        },
        { onConflict: "chat_id,shared_with" },
      )
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row as ShareRow;
  });

export const updateSharePermission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; permission: "view" | "edit" }) =>
    z.object({ id: z.string().uuid(), permission: z.enum(["view", "edit"]) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("chat_shares")
      .update({ permission: data.permission })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const revokeShare = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("chat_shares").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
