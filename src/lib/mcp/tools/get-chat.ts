import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, requireAuth, supabaseForUser, textResult } from "../supabase";

type TurnContent = { text?: string; summary?: string; bullets?: string[] };

export default defineTool({
  name: "get_chat",
  title: "Read a RegIQ chat",
  description: "Read the full question-and-answer history of one RegIQ chat the user can access.",
  inputSchema: {
    chat_id: z.string().uuid().describe("The chat id, as returned by list_chats."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ chat_id }, ctx) => {
    try {
      requireAuth(ctx);
      const supabase = supabaseForUser(ctx);
      const { data, error } = await supabase
        .from("chat_messages")
        .select("role, content, created_at")
        .eq("chat_id", chat_id)
        .order("created_at", { ascending: true });
      if (error) return errorResult(error.message);

      const rows = data ?? [];
      if (rows.length === 0) return textResult("No messages found for this chat.");

      const text = rows
        .map((r) => {
          const c = (r.content ?? {}) as TurnContent;
          if (r.role === "user") return `Q: ${c.text ?? ""}`;
          const bullets = (c.bullets ?? []).map((b) => `  • ${b}`).join("\n");
          return `A: ${c.summary ?? ""}${bullets ? `\n${bullets}` : ""}`;
        })
        .join("\n\n");

      return {
        content: [{ type: "text" as const, text }],
        structuredContent: { messages: rows },
      };
    } catch (error) {
      return errorResult(error instanceof Error ? error.message : "Failed to read chat");
    }
  },
});
