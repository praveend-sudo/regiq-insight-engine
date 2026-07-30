import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, requireAuth, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "list_chats",
  title: "List RegIQ chats",
  description: "List the signed-in user's RegIQ compliance chats, newest first.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).describe("Maximum number of chats to return.").default(20),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    try {
      requireAuth(ctx);
      const supabase = supabaseForUser(ctx);
      const { data, error } = await supabase
        .from("chats")
        .select("id, title, project_id, created_at, updated_at")
        .order("updated_at", { ascending: false })
        .limit(limit ?? 20);
      if (error) return errorResult(error.message);

      const rows = data ?? [];
      if (rows.length === 0) return textResult("No chats yet.");
      return {
        content: [
          {
            type: "text" as const,
            text: rows.map((r) => `${r.id} · ${r.title} (updated ${r.updated_at})`).join("\n"),
          },
        ],
        structuredContent: { chats: rows },
      };
    } catch (error) {
      return errorResult(error instanceof Error ? error.message : "Failed to list chats");
    }
  },
});
