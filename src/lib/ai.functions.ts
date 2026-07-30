import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type AiCitation = {
  id: string;
  type: "external" | "internal";
  issuer: string;
  title: string;
  section: string;
  date: string;
  relevance: number;
  excerpt: string;
};

export type AiAnswer = {
  summary: string;
  bullets: string[];
  confidence: number;
  citations: AiCitation[];
};

// Compact corpus the model can cite from. Mirrors mock-data.ts sources but
// lives here so the server function is self-contained.
export const CORPUS: AiCitation[] = [
  {
    id: "cbsl-trmd-2021",
    type: "external",
    issuer: "CBSL",
    title: "Technology Risk Management Direction No. 04 of 2021",
    section: "§3.2, §6.1",
    date: "15 Oct 2021",
    relevance: 0,
    excerpt:
      "Licensed banks shall report material cyber incidents to the Director of Bank Supervision within 24 hours of detection, and complete a root-cause report within 7 days.",
  },
  {
    id: "cbsl-baf-2022",
    type: "external",
    issuer: "CBSL",
    title: "Banking Act Directions on Corporate Governance",
    section: "§4.1",
    date: "2022",
    relevance: 0,
    excerpt:
      "Boards of licensed commercial banks must include a majority of independent non-executive directors and establish Board Audit, Risk, and HRRC committees.",
  },
  {
    id: "sec-rpt-2016",
    type: "external",
    issuer: "SEC",
    title: "SEC Rule on Related-Party Transactions (Listed Companies)",
    section: "§9(h), §9(i)",
    date: "1 Jan 2016",
    relevance: 0,
    excerpt:
      "A listed entity shall obtain prior shareholder approval for any related-party transaction where the aggregate value exceeds 10% of equity OR 5% of total assets — whichever is lower. Full disclosure required for all RPTs above LKR 1 Mn.",
  },
  {
    id: "cse-esg-2025",
    type: "external",
    issuer: "CSE",
    title: "CSE Listing Rules — Sustainability & ESG Disclosures",
    section: "§7.6(iv)",
    date: "1 Jan 2025",
    relevance: 0,
    excerpt:
      "All listed entities shall include, from FY commencing 1 January 2025, a Sustainability Report aligned with IFRS S1 & S2 standards as part of their annual report. Scope 1, 2 and material Scope 3 GHG disclosures are mandatory.",
  },
  {
    id: "ird-wht-2024",
    type: "external",
    issuer: "IRD",
    title: "IRD Guideline on Withholding Tax — Amendment 2024",
    section: "§3(a)",
    date: "1 Apr 2024",
    relevance: 0,
    excerpt:
      "Withholding tax at 14% applies on service fees paid to non-resident persons unless a Double Tax Avoidance Agreement provides otherwise. Tax residency certificate required as DTAA evidence.",
  },
  {
    id: "ird-vat-2024",
    type: "external",
    issuer: "IRD",
    title: "Value Added Tax (Amendment) Act — 2024",
    section: "§2",
    date: "1 Jan 2024",
    relevance: 0,
    excerpt:
      "Standard VAT rate is 18%. Registration threshold is LKR 60 million per annum turnover. Monthly returns required.",
  },
  {
    id: "cbsl-aml-2015",
    type: "external",
    issuer: "CBSL",
    title: "Financial Transactions Reporting Act No. 6 of 2006 & CBSL AML/CFT Rules",
    section: "§5, §6",
    date: "2015",
    relevance: 0,
    excerpt:
      "Reporting institutions must file Suspicious Transaction Reports (STRs) with the Financial Intelligence Unit and conduct enhanced due diligence on PEPs and high-risk customers.",
  },
  {
    id: "int-incident-v42",
    type: "internal",
    issuer: "Internal",
    title: "IT Security Policy v4.2 — Incident Response",
    section: "§5.4",
    date: "20 Mar 2024",
    relevance: 0,
    excerpt:
      "Confirmed information security incidents shall be reported to the CISO within 48 hours. External regulatory notifications shall be initiated by the Compliance Officer thereafter.",
  },
  {
    id: "int-remit-v3",
    type: "internal",
    issuer: "Internal",
    title: "Remittance Operations Manual v3.1",
    section: "§4.2",
    date: "12 Feb 2024",
    relevance: 0,
    excerpt:
      "Outward remittances above USD 20,000 require additional AML screening and Deputy Compliance Officer sign-off. WHT computed at pre-2024 rates.",
  },
  {
    id: "int-board-charter",
    type: "internal",
    issuer: "Internal",
    title: "Board Charter (Annex B — Related-Party Transactions)",
    section: "Annex B",
    date: "2023",
    relevance: 0,
    excerpt:
      "Related-party transactions above 5% of total assets require Board Related-Party Transactions Review Committee approval prior to execution.",
  },
];

export const SYSTEM_PROMPT = `You are RegIQ, an AI compliance assistant for financial institutions in Sri Lanka. You answer compliance questions grounded ONLY in the provided regulatory corpus (CBSL, SEC, CSE, IRD) and internal policy excerpts.

You MUST respond with a single JSON object matching exactly this shape:
{
  "summary": string,          // 1-3 sentence executive summary
  "bullets": string[],        // 3-5 concise key points, each citing the regulator/section
  "confidence": number,       // 0-100 how well the corpus supports the answer
  "citation_ids": string[]    // ids of corpus items you used, in order of relevance
}

Rules:
- Only cite ids present in the provided corpus. Do not invent sources.
- If the corpus lacks the answer, say so plainly in the summary and set confidence low (< 40).
- Be direct, professional, and specific to Sri Lankan regulation.
- Do not include markdown, code fences, or any text outside the JSON object.`;

type ModelResponse = {
  summary: string;
  bullets: string[];
  confidence: number;
  citation_ids: string[];
};

export const answerCompliance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        question: z.string().min(1).max(2000),
        history: z
          .array(
            z.object({
              role: z.enum(["user", "assistant"]),
              content: z.string(),
            }),
          )
          .max(20)
          .optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<AiAnswer> => {
    const { callGatewayJSON } = await import("./ai-gateway.server");

    const corpusForPrompt = CORPUS.map((c) => ({
      id: c.id,
      issuer: c.issuer,
      title: c.title,
      section: c.section,
      date: c.date,
      type: c.type,
      excerpt: c.excerpt,
    }));

    const messages = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      {
        role: "system" as const,
        content: `Regulatory & internal corpus (JSON):\n${JSON.stringify(corpusForPrompt)}`,
      },
      ...(data.history ?? []).map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: data.question },
    ];

    const result = await callGatewayJSON<ModelResponse>({ messages });

    const usedIds = new Set(result.citation_ids ?? []);
    const citations: AiCitation[] = CORPUS.filter((c) => usedIds.has(c.id)).map((c, i) => ({
      ...c,
      relevance: Math.max(70, 95 - i * 5),
    }));

    return {
      summary: result.summary ?? "",
      bullets: Array.isArray(result.bullets) ? result.bullets.slice(0, 6) : [],
      confidence: Math.max(0, Math.min(100, Math.round(result.confidence ?? 0))),
      citations,
    };
  });
