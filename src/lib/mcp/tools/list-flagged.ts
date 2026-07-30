import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, requireAuth, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "list_flagged_answers",
  title: "List flagged answers",
  description: "List RegIQ answers the signed-in user flagged for compliance review.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).describe("Maximum number of flagged answers.").default(20),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    try {
      requireAuth(ctx);
      const supabase = supabaseForUser(ctx);
      const { data, error } = await supabase
        .from("flagged_answers")
        .select("id, question, summary, note, created_at")
        .order("created_at", { ascending: false })
        .limit(limit ?? 20);
      if (error) return errorResult(error.message);

      const rows = data ?? [];
      if (rows.length === 0) return textResult("No flagged answers.");
      return {
        content: [
          { type: "text" as const, text: rows.map((r) => `• ${r.question}\n  ${r.summary}`).join("\n\n") },
        ],
        structuredContent: { flagged: rows },
      };
    } catch (error) {
      return errorResult(error instanceof Error ? error.message : "Failed to list flagged answers");
    }
  },
});
