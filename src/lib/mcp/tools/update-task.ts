import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, requireAuth, supabaseForUser } from "../supabase";

export default defineTool({
  name: "update_task",
  title: "Update a compliance task",
  description: "Update the status and/or remarks of an existing compliance task.",
  inputSchema: {
    id: z.string().uuid().describe("The task id."),
    status: z.enum(["open", "in_progress", "done"]).describe("New task status.").optional(),
    remarks: z.string().max(4000).describe("Remarks to record on the task.").optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ id, status, remarks }, ctx) => {
    try {
      requireAuth(ctx);
      if (!status && remarks === undefined) return errorResult("Provide status and/or remarks to update.");
      const supabase = supabaseForUser(ctx);
      const patch: Record<string, unknown> = {};
      if (status) patch.status = status;
      if (remarks !== undefined) patch.remarks = remarks;

      const { data, error } = await supabase
        .from("tasks")
        .update(patch)
        .eq("id", id)
        .select("id, title, status, remarks")
        .single();
      if (error) return errorResult(error.message);
      return {
        content: [{ type: "text" as const, text: `Updated task "${data.title}" → ${data.status}` }],
        structuredContent: { task: data },
      };
    } catch (error) {
      return errorResult(error instanceof Error ? error.message : "Failed to update task");
    }
  },
});
