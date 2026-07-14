export type Citation = {
  id: string;
  type: "external" | "internal";
  issuer: string; // CBSL / SEC / CSE / IRD / Internal
  title: string;
  section: string;
  date: string;
  relevance: number; // 0-100
  excerpt: string;
};

export type AnswerData = {
  summary: string;
  bullets: string[];
  confidence: number; // 0-100
  citations: Citation[];
};

export type ChatTurn = {
  id: string;
  question: string;
  answer: AnswerData;
};

export const SUGGESTED_QUESTIONS = [
  "Does our incident response policy comply with CBSL's Technology Risk Management Direction?",
  "What are the SEC related-party transaction disclosure requirements?",
  "Summarize IRD withholding tax obligations on outward remittances.",
  "Are we ready for CSE ESG disclosure requirements this reporting cycle?",
];

const CBSL_TRMD: Citation = {
  id: "cbsl-trmd-2021",
  type: "external",
  issuer: "CBSL",
  title: "Technology Risk Management Direction No. 04 of 2021",
  section: "§3.2, §6.1",
  date: "15 Oct 2021",
  relevance: 96,
  excerpt:
    "Licensed banks shall report material cyber incidents to the Director of Bank Supervision within twenty-four (24) hours of detection, and complete a root-cause report within seven (7) days.",
};

const INTERNAL_INCIDENT: Citation = {
  id: "int-incident-v42",
  type: "internal",
  issuer: "Internal",
  title: "IT Security Policy v4.2 — Incident Response",
  section: "§5.4",
  date: "20 Mar 2024",
  relevance: 92,
  excerpt:
    "Confirmed information security incidents shall be reported to the Chief Information Security Officer within forty-eight (48) hours. External regulatory notifications shall be initiated by the Compliance Officer thereafter.",
};

const SEC_RPT: Citation = {
  id: "sec-rpt-2013",
  type: "external",
  issuer: "SEC",
  title: "SEC Rule on Related-Party Transactions (Listed Companies)",
  section: "§9(h), §9(i)",
  date: "1 Jan 2016",
  relevance: 94,
  excerpt:
    "A listed entity shall obtain prior shareholder approval for any related-party transaction where the aggregate value exceeds 10% of the equity or 5% of the total assets, whichever is lower.",
};

const CSE_ESG: Citation = {
  id: "cse-esg-2024",
  type: "external",
  issuer: "CSE",
  title: "CSE Listing Rules — Sustainability & ESG Disclosures",
  section: "§7.6(iv)",
  date: "1 Jan 2025",
  relevance: 89,
  excerpt:
    "All listed entities shall include, from the financial year commencing 1 January 2025, a Sustainability Report aligned with the IFRS S1 & S2 standards as part of their annual report.",
};

const IRD_WHT: Citation = {
  id: "ird-wht-2024",
  type: "external",
  issuer: "IRD",
  title: "IRD Guideline on Withholding Tax — Amendment 2024",
  section: "§3(a)",
  date: "1 Apr 2024",
  relevance: 91,
  excerpt:
    "Withholding tax at 14% applies on service fees paid to non-resident persons unless a Double Tax Avoidance Agreement provides otherwise.",
};

const INTERNAL_REMITTANCE: Citation = {
  id: "int-remit-v3",
  type: "internal",
  issuer: "Internal",
  title: "Remittance Operations Manual v3.1",
  section: "§4.2",
  date: "12 Feb 2024",
  relevance: 87,
  excerpt:
    "Outward remittances above USD 20,000 require additional AML screening and Deputy Compliance Officer sign-off before release.",
};

// Demo answers removed — chat now uses real AI (see src/lib/ai.functions.ts).


export const DATA_SOURCES = {
  external: [
    { id: "cbsl", name: "Central Bank of Sri Lanka (CBSL)", docs: 1284, updated: "2h ago", status: "synced" as const },
    { id: "sec",  name: "Securities & Exchange Commission (SEC)", docs: 612, updated: "5h ago", status: "synced" as const },
    { id: "cse",  name: "Colombo Stock Exchange (CSE)", docs: 431, updated: "1d ago", status: "syncing" as const },
    { id: "ird",  name: "Inland Revenue Department (IRD)", docs: 289, updated: "3h ago", status: "synced" as const },
  ],
  internal: [
    { id: "policy", name: "Policy Library (SharePoint)", docs: 342, updated: "1h ago", status: "synced" as const },
    { id: "dms",    name: "Compliance DMS", docs: 987, updated: "20m ago", status: "synced" as const },
    { id: "legal",  name: "Legal Contracts Vault", docs: 156, updated: "6h ago", status: "syncing" as const },
  ],
};

export type SeedNotification = {
  title: string;
  summary: string;
  impact: "high" | "medium" | "low";
  issuer: string;
  linked: string[];
  ai_insight: string;
};

export const SEED_NOTIFICATIONS: SeedNotification[] = [
  {
    title: "CBSL Circular 07/2026 — Revised Cyber Incident Reporting Timelines",
    summary:
      "CBSL has shortened the material cyber incident notification window from 24 hours to 12 hours and introduced a mandatory quarterly resilience test attestation.",
    impact: "high",
    issuer: "CBSL",
    linked: ["IT Security Policy v4.2 §5.4", "Business Continuity Plan §3", "Operational Resilience Framework"],
    ai_insight:
      "Your IT Security Policy still references a 48h internal window. 2 sections require amendment and 14 branch SOPs will need retraining.",
  },
  {
    title: "IRD Guideline — Withholding Tax on Digital Services (Q2 2026)",
    summary:
      "IRD clarifies that streaming, SaaS and cloud subscriptions purchased from non-resident providers fall under 14% WHT with revised DTAA evidence requirements.",
    impact: "medium",
    issuer: "IRD",
    linked: ["Remittance Operations Manual v3.1 §4.2", "Vendor Payments Policy"],
    ai_insight:
      "12 recurring vendor contracts likely fall in scope. Finance operations workflow needs a DTAA-certificate checkpoint before payment release.",
  },
  {
    title: "CSE Listing Rule 7.6(iv) — Sustainability Reporting takes effect 1 Jan 2025",
    summary:
      "IFRS S1 & S2 aligned Sustainability Report becomes a mandatory section of the annual report for all listed entities.",
    impact: "high",
    issuer: "CSE",
    linked: ["Annual Report Preparation Checklist", "ESG Disclosure Policy (draft)"],
    ai_insight:
      "Current CSR narrative does not satisfy IFRS S2 climate disclosures. Recommend engaging assurance provider by Q3 2026.",
  },
  {
    title: "SEC Bulletin — Enhanced Related-Party Transaction Committee Composition",
    summary:
      "Independent directors must form the majority of the RPT Review Committee; quarterly attestation to the SEC required.",
    impact: "low",
    issuer: "SEC",
    linked: ["Board Charter Annex B", "Corporate Governance Manual"],
    ai_insight: "Current committee already meets independence threshold; only quarterly attestation workflow is new.",
  },
];

export const INSIGHT_KPIS = {
  score: 78,
  openGaps: 12,
  changes30d: { CBSL: 8, SEC: 3, CSE: 2, IRD: 5 },
  nextDeadline: { label: "CBSL Quarterly Cyber Resilience Attestation", date: "31 Jul 2026" },
};

export const REGULATORY_TIMELINE = [
  { month: "Feb", CBSL: 4, SEC: 1, CSE: 0, IRD: 2 },
  { month: "Mar", CBSL: 6, SEC: 2, CSE: 1, IRD: 3 },
  { month: "Apr", CBSL: 5, SEC: 1, CSE: 2, IRD: 4 },
  { month: "May", CBSL: 7, SEC: 3, CSE: 1, IRD: 3 },
  { month: "Jun", CBSL: 9, SEC: 2, CSE: 3, IRD: 5 },
  { month: "Jul", CBSL: 8, SEC: 3, CSE: 2, IRD: 5 },
];

export const GAPS_BY_CATEGORY = [
  { category: "Cybersecurity", value: 5 },
  { category: "Tax & Remittance", value: 3 },
  { category: "ESG Reporting", value: 2 },
  { category: "Governance", value: 2 },
];

export const AI_RISKS = [
  { severity: "high" as const, title: "Cyber incident reporting window mismatch", section: "IT Security Policy §5.4", owner: "CISO" },
  { severity: "high" as const, title: "IFRS S2 climate disclosures not yet drafted", section: "Annual Report", owner: "Head of Sustainability" },
  { severity: "medium" as const, title: "Outdated WHT rates in Remittance Ops Manual", section: "§4.2", owner: "Head of Operations" },
  { severity: "medium" as const, title: "RPT quarterly attestation workflow missing", section: "Board Charter Annex B", owner: "Company Secretary" },
  { severity: "low" as const, title: "Vendor payment DTAA-evidence checkpoint absent", section: "Vendor Payments Policy", owner: "Finance Manager" },
];

// pickAnswerForQuery removed — see answerCompliance in src/lib/ai.functions.ts.

