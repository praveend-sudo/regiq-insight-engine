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
  action: string;
  confidence: number; // 0-100
  citations: Citation[];
  gap?: string;
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

export const DEMO_ANSWERS: Record<string, AnswerData> = {
  incident: {
    summary:
      "Your internal incident-response window is misaligned with CBSL. Internal policy allows 48 hours; CBSL requires 24 hours to the Director of Bank Supervision for material cyber incidents.",
    bullets: [
      "CBSL Technology Risk Management Direction §3.2 mandates a 24-hour notification to the Director of Bank Supervision for material cyber incidents.",
      "Your IT Security Policy v4.2 §5.4 currently sets a 48-hour internal escalation to the CISO before regulator notification.",
      "A 7-day root-cause report to CBSL is also required (§6.1) — this is not covered by the internal policy.",
    ],
    action:
      "Amend IT Security Policy v4.2 §5.4 to require CISO notification within 4 hours and CBSL notification within 24 hours. Add a 7-day root-cause reporting template aligned to CBSL Direction §6.1.",
    confidence: 92,
    citations: [CBSL_TRMD, INTERNAL_INCIDENT],
    gap: "Your internal policy allows 48h incident reporting but CBSL requires 24h — 1 section requires amendment.",
  },
  rpt: {
    summary:
      "For listed companies, SEC requires prior shareholder approval for related-party transactions above defined thresholds. Your board charter references the 5% asset threshold but omits the 10% equity trigger.",
    bullets: [
      "SEC §9(h) requires shareholder approval where a related-party transaction exceeds 10% of equity OR 5% of total assets — whichever is lower.",
      "Full disclosure in the annual report is required for all RPTs above LKR 1 Mn (SEC §9(i)).",
      "Independent director majority is required on the Related-Party Transactions Review Committee.",
    ],
    action:
      "Update Board Charter Annex B to reflect the 'lower of 10% equity or 5% assets' rule. Add RPT quarterly disclosure workflow to Compliance Ops calendar.",
    confidence: 88,
    citations: [SEC_RPT, INTERNAL_INCIDENT],
  },
  wht: {
    summary:
      "Outward service fees to non-residents attract 14% withholding tax unless a DTAA applies. Your Remittance Ops Manual references the earlier 5% rate — this is out of date.",
    bullets: [
      "IRD Guideline on Withholding Tax (Amendment 2024) §3(a): 14% on service fees to non-residents.",
      "DTAA relief available for 44 partner jurisdictions — evidence of tax residency certificate required.",
      "Remittance Operations Manual v3.1 §4.2 still references pre-2024 rate assumptions.",
    ],
    action:
      "Update Remittance Ops Manual §4.2 to reflect 14% WHT and DTAA evidence requirements. Retrain branch operations staff by end of Q2.",
    confidence: 79,
    citations: [IRD_WHT, INTERNAL_REMITTANCE],
    gap: "Remittance manual references outdated 5% WHT — 14 branch SOPs affected.",
  },
  esg: {
    summary:
      "CSE has mandated IFRS S1/S2-aligned Sustainability Reports for listed entities from FY 2025. Your current CSR chapter is narrative-only and will not satisfy this requirement.",
    bullets: [
      "CSE Listing Rule §7.6(iv) requires an IFRS S1 & S2 Sustainability Report in the annual report from 1 January 2025.",
      "Scope 1, 2 and material Scope 3 GHG disclosures are mandatory.",
      "Board sustainability oversight statement is required.",
    ],
    action:
      "Initiate ESG data-collection workstream. Engage assurance provider by Q3. Map current CSR content to IFRS S1/S2 disclosure taxonomy.",
    confidence: 71,
    citations: [CSE_ESG],
  },
};

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

export function pickAnswerForQuery(q: string): AnswerData {
  const s = q.toLowerCase();
  if (s.includes("incident") || s.includes("cyber") || s.includes("cbsl")) return DEMO_ANSWERS.incident;
  if (s.includes("related") || s.includes("rpt") || s.includes("sec")) return DEMO_ANSWERS.rpt;
  if (s.includes("withhold") || s.includes("wht") || s.includes("ird") || s.includes("remit")) return DEMO_ANSWERS.wht;
  if (s.includes("esg") || s.includes("sustainab") || s.includes("cse")) return DEMO_ANSWERS.esg;
  return DEMO_ANSWERS.incident;
}
