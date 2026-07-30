import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, requireAuth, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "list_tasks",
  title: "List compliance tasks",
  description: "List compliance tasks the signed-in user created or is assigned to, newest first.",
  inputSchema: {
    status: z
      .enum(["open", "in_progress", "done", "all"])
      .describe("Filter by task status, or 'all'.")
      .default("all"),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status }, ctx) => {
    try {
      const userId = requireAuth(ctx);
      const supabase = supabaseForUser(ctx);
      let query = supabase
        .from("tasks")
        .select("id, title, description, status, remarks, assigned_to, created_at")
        .or(`user_id.eq.${userId},assigned_to.eq.${userId}`)
        .order("created_at", { ascending: false })
        .limit(100);
      if (status && status !== "all") query = query.eq("status", status);

      const { data, error } = await query;
      if (error) return errorResult(error.message);

      const rows = data ?? [];
      if (rows.length === 0) return textResult("No tasks found.");
      return {
        content: [
          {
            type: "text" as const,
            text: rows.map((r) => `[${r.status}] ${r.title} (${r.id})`).join("\n"),
          },
        ],
        structuredContent: { tasks: rows },
      };
    } catch (error) {
      return errorResult(error instanceof Error ? error.message : "Failed to list tasks");
    }
  },
});
