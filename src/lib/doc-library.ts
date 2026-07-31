// Client-safe catalogue of linkable regulatory documents.

export type LinkedDoc = {
  id: string;
  type: "external" | "internal";
  issuer: string;
  title: string;
  section?: string;
};

/** Known external regulatory documents that can be linked to memos and tasks. */
export const EXTERNAL_DOCS: LinkedDoc[] = [
  {
    id: "cbsl-trmd-2021",
    type: "external",
    issuer: "CBSL",
    title: "Technology Risk Management Direction No. 04 of 2021",
    section: "§3.2, §6.1",
  },
  {
    id: "cbsl-gov-2022",
    type: "external",
    issuer: "CBSL",
    title: "Banking Act Directions on Corporate Governance",
    section: "§4.1",
  },
  {
    id: "cbsl-aml-2023",
    type: "external",
    issuer: "CBSL",
    title: "Financial Transactions Reporting Act — CDD Rules",
    section: "§5",
  },
  {
    id: "sec-rpt-2016",
    type: "external",
    issuer: "SEC",
    title: "SEC Rule on Related-Party Transactions (Listed Companies)",
    section: "§9(h), §9(i)",
  },
  {
    id: "cse-esg-2025",
    type: "external",
    issuer: "CSE",
    title: "CSE Listing Rules — Sustainability & ESG Disclosures",
    section: "§7.6(iv)",
  },
  {
    id: "cse-cont-disc",
    type: "external",
    issuer: "CSE",
    title: "CSE Listing Rules — Continuing Listing Requirements",
    section: "§7.4",
  },
  {
    id: "ird-wht-2024",
    type: "external",
    issuer: "IRD",
    title: "IRD Guideline on Withholding Tax — Amendment 2024",
    section: "§3(a)",
  },
  {
    id: "ird-vat-2024",
    type: "external",
    issuer: "IRD",
    title: "Inland Revenue (Amendment) Act — VAT on Financial Services",
    section: "§25C",
  },
];

/** Built-in internal policy documents (supplemented at runtime by uploads). */
export const INTERNAL_DOCS: LinkedDoc[] = [
  {
    id: "int-incident-v42",
    type: "internal",
    issuer: "Internal",
    title: "IT Security Policy v4.2 — Incident Response",
    section: "§5.4",
  },
  {
    id: "int-remit-v3",
    type: "internal",
    issuer: "Internal",
    title: "Remittance Operations Manual v3.1",
    section: "§4.2",
  },
  {
    id: "int-aml-v6",
    type: "internal",
    issuer: "Internal",
    title: "AML/CFT Compliance Policy v6.0",
    section: "§2",
  },
  {
    id: "int-board-charter",
    type: "internal",
    issuer: "Internal",
    title: "Board Governance Charter 2025",
  },
];

export function describeDocs(docs: LinkedDoc[]): string {
  return docs
    .map((d) => `- [${d.type}] ${d.issuer}: ${d.title}${d.section ? ` (${d.section})` : ""}`)
    .join("\n");
}
