import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, requireAuth, supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_task",
  title: "Create a compliance task",
  description: "Create a new compliance follow-up task owned by the signed-in user.",
  inputSchema: {
    title: z.string().min(1).max(300).describe("Short task title."),
    description: z.string().max(4000).describe("Optional task detail.").optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ title, description }, ctx) => {
    try {
      const userId = requireAuth(ctx);
      const supabase = supabaseForUser(ctx);
      const { data, error } = await supabase
        .from("tasks")
        .insert({ title, description: description ?? null, user_id: userId })
        .select("id, title, status")
        .single();
      if (error) return errorResult(error.message);
      return {
        content: [{ type: "text" as const, text: `Created task "${data.title}" (${data.id})` }],
        structuredContent: { task: data },
      };
    } catch (error) {
      return errorResult(error instanceof Error ? error.message : "Failed to create task");
    }
  },
});
