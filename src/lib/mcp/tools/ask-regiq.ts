import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, requireAuth } from "../supabase";

type ModelResponse = {
  summary: string;
  bullets: string[];
  confidence: number;
  citation_ids: string[];
};

export default defineTool({
  name: "ask_regiq",
  title: "Ask RegIQ a compliance question",
  description:
    "Answer a Sri Lankan financial compliance question grounded in CBSL, SEC, CSE and IRD regulations plus internal policy excerpts. Returns a summary, key points and the sources used.",
  inputSchema: {
    question: z.string().min(1).describe("The compliance question to answer."),
  },
  annotations: { readOnlyHint: true, idempotentHint: false, openWorldHint: false },
  handler: async ({ question }, ctx) => {
    try {
      requireAuth(ctx);
      const [{ CORPUS, SYSTEM_PROMPT }, { callGatewayJSON }] = await Promise.all([
        import("@/lib/ai.functions"),
        import("@/lib/ai-gateway.server"),
      ]);

      const corpusForPrompt = CORPUS.map((c) => ({
        id: c.id,
        issuer: c.issuer,
        title: c.title,
        section: c.section,
        date: c.date,
        type: c.type,
        excerpt: c.excerpt,
      }));

      const result = await callGatewayJSON<ModelResponse>({
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "system",
            content: `Regulatory & internal corpus (JSON):\n${JSON.stringify(corpusForPrompt)}`,
          },
          { role: "user", content: question },
        ],
      });

      const used = new Set(result.citation_ids ?? []);
      const citations = CORPUS.filter((c) => used.has(c.id)).map((c) => ({
        issuer: c.issuer,
        title: c.title,
        section: c.section,
        date: c.date,
        type: c.type,
      }));

      const bullets = Array.isArray(result.bullets) ? result.bullets.slice(0, 6) : [];
      const text = [
        result.summary ?? "",
        "",
        ...bullets.map((b) => `• ${b}`),
        "",
        "Sources:",
        ...citations.map((c) => `- [${c.type === "external" ? "EXT" : "INT"}] ${c.issuer} · ${c.title} — ${c.section}`),
      ].join("\n");

      return {
        content: [{ type: "text" as const, text }],
        structuredContent: { summary: result.summary ?? "", bullets, citations },
      };
    } catch (error) {
      return errorResult(error instanceof Error ? error.message : "Failed to answer question");
    }
  },
});
