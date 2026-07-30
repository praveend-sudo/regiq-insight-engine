// Client-safe scheduling helpers shared by the calendar UI and server functions.

export const FREQUENCIES = [
  "one_off",
  "monthly",
  "quarterly",
  "half_yearly",
  "annual",
] as const;
export type Frequency = (typeof FREQUENCIES)[number];

export const FREQUENCY_LABEL: Record<Frequency, string> = {
  one_off: "One-off",
  monthly: "Monthly",
  quarterly: "Quarterly",
  half_yearly: "Half-yearly",
  annual: "Annual",
};

export type Audience = "regulator" | "internal";

export type ObligationRow = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  source_type: "internal" | "external";
  issuer: string | null;
  audience: Audience;
  frequency: Frequency;
  next_due_date: string;
  lead_days: number;
  recipients: string[];
  active: boolean;
  last_completed_at: string | null;
  reminded_for: string | null;
  created_at: string;
  updated_at: string;
};

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function advance(dateISO: string, freq: Frequency): string {
  const d = parseISODate(dateISO);
  const months =
    freq === "monthly" ? 1 : freq === "quarterly" ? 3 : freq === "half_yearly" ? 6 : freq === "annual" ? 12 : 0;
  if (months === 0) return dateISO;
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return toISODate(d);
}

export function daysBetween(fromISO: string, toISOStr: string): number {
  const a = parseISODate(fromISO).getTime();
  const b = parseISODate(toISOStr).getTime();
  return Math.round((b - a) / 86400000);
}

/** Expand a recurring obligation into occurrence dates within [start, end]. */
export function expandOccurrences(
  ob: Pick<ObligationRow, "next_due_date" | "frequency">,
  startISO: string,
  endISO: string,
  max = 60,
): string[] {
  const out: string[] = [];
  let cur = ob.next_due_date;
  // Walk backwards first so earlier occurrences in the window are included.
  if (ob.frequency !== "one_off") {
    let back = cur;
    for (let i = 0; i < max; i++) {
      const prev = retreat(back, ob.frequency);
      if (prev === back || daysBetween(startISO, prev) < 0) break;
      back = prev;
      out.push(prev);
    }
  }
  for (let i = 0; i < max; i++) {
    if (daysBetween(cur, endISO) < 0) break;
    if (daysBetween(startISO, cur) >= 0) out.push(cur);
    if (ob.frequency === "one_off") break;
    cur = advance(cur, ob.frequency);
  }
  return Array.from(new Set(out)).sort();
}

function retreat(dateISO: string, freq: Frequency): string {
  const d = parseISODate(dateISO);
  const months =
    freq === "monthly" ? 1 : freq === "quarterly" ? 3 : freq === "half_yearly" ? 6 : freq === "annual" ? 12 : 0;
  if (months === 0) return dateISO;
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() - months);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return toISODate(d);
}

/** Colour tokens shared between the calendar and the task list. */
export type EventKind = "assigned_by_me" | "assigned_to_me" | "regulator" | "internal";

export const EVENT_STYLE: Record<
  EventKind,
  { label: string; dot: string; chip: string; text: string }
> = {
  assigned_to_me: {
    label: "Assigned to me",
    dot: "bg-[color:var(--brand-violet)]",
    chip: "bg-[color:var(--brand-violet)]/12 border-[color:var(--brand-violet)]/35",
    text: "text-[color:var(--brand-violet)]",
  },
  assigned_by_me: {
    label: "Assigned by me",
    dot: "bg-[color:var(--brand-cyan)]",
    chip: "bg-[color:var(--brand-cyan)]/12 border-[color:var(--brand-cyan)]/35",
    text: "text-[color:var(--brand-blue)]",
  },
  regulator: {
    label: "Regulator report",
    dot: "bg-[color:var(--risk)]",
    chip: "bg-[color:var(--risk)]/10 border-[color:var(--risk)]/35",
    text: "text-[color:var(--risk)]",
  },
  internal: {
    label: "Internal report",
    dot: "bg-[color:var(--success)]",
    chip: "bg-[color:var(--success)]/10 border-[color:var(--success)]/35",
    text: "text-[color:var(--success)]",
  },
};

export function taskKind(task: { user_id: string; assigned_to: string | null }, me: string | null): EventKind {
  if (me && task.assigned_to === me && task.user_id !== me) return "assigned_to_me";
  if (me && task.assigned_to && task.assigned_to !== me) return "assigned_by_me";
  return "assigned_to_me";
}
