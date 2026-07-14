import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { AppLayout } from "@/components/regiq/AppLayout";
import { AI_RISKS, GAPS_BY_CATEGORY, INSIGHT_KPIS, REGULATORY_TIMELINE } from "@/lib/mock-data";
import { ConfidenceRing } from "@/components/regiq/ConfidenceRing";
import { AlertTriangle, CalendarClock, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/app/insights")({
  component: InsightsPage,
});

const CHART_COLORS = ["#5B21B6", "#8B5CF6", "#2563EB", "#17C3E8"];

function InsightsPage() {
  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-6xl overflow-y-auto px-4 py-8 md:px-8">
        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-4">
          <KpiCard title="Compliance Score">
            <div className="flex items-center justify-center py-2">
              <ConfidenceRing value={INSIGHT_KPIS.score} size={120} />
            </div>
          </KpiCard>

          <KpiCard title="Open Policy Gaps">
            <div className="flex items-baseline gap-2 pt-4">
              <span className="text-4xl font-black text-[color:var(--risk)]">{INSIGHT_KPIS.openGaps}</span>
              <span className="text-xs text-muted-foreground">across 4 categories</span>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              <AlertTriangle className="mr-1 inline h-3 w-3 text-[color:var(--risk)]" />
              2 high-severity items unresolved
            </p>
          </KpiCard>

          <KpiCard title="Regulatory Changes · 30d">
            <div className="pt-3 space-y-1.5 text-xs">
              {Object.entries(INSIGHT_KPIS.changes30d).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between">
                  <span className="font-medium">{k}</span>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-gradient-brand"
                        style={{ width: `${Math.min(100, v * 10)}%` }}
                      />
                    </div>
                    <span className="w-4 text-right font-bold">{v}</span>
                  </div>
                </div>
              ))}
            </div>
          </KpiCard>

          <KpiCard title="Next Deadline">
            <div className="pt-3">
              <div className="flex items-center gap-2 text-[color:var(--brand-indigo)]">
                <CalendarClock className="h-5 w-5" />
                <span className="text-lg font-black">{INSIGHT_KPIS.nextDeadline.date}</span>
              </div>
              <p className="mt-2 text-sm text-foreground/80">{INSIGHT_KPIS.nextDeadline.label}</p>
            </div>
          </KpiCard>
        </div>

        {/* Charts */}
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-2xl border bg-card p-5 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">Regulatory Changes by Regulator</h3>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-[color:var(--brand-cyan)]" />
                Last 6 months
              </span>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={REGULATORY_TIMELINE}>
                <defs>
                  {["CBSL", "SEC", "CSE", "IRD"].map((k, i) => (
                    <linearGradient key={k} id={`g-${k}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_COLORS[i]} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={CHART_COLORS[i]} stopOpacity={0.05} />
                    </linearGradient>
                  ))}
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", backgroundColor: "var(--card)" }}
                />
                {["CBSL", "SEC", "CSE", "IRD"].map((k, i) => (
                  <Area key={k} type="monotone" dataKey={k} stroke={CHART_COLORS[i]} strokeWidth={2} fill={`url(#g-${k})`} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-2xl border bg-card p-5 shadow-card">
            <h3 className="mb-3 font-semibold">Gaps by Category</h3>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={GAPS_BY_CATEGORY}
                  dataKey="value"
                  nameKey="category"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={4}
                >
                  {GAPS_BY_CATEGORY.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risks */}
        <div className="mt-6 rounded-2xl border bg-card p-5 shadow-card">
          <h3 className="mb-4 font-semibold">AI-Detected Risks & Recommendations</h3>
          <ul className="space-y-2">
            {AI_RISKS.map((r, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 rounded-lg border border-transparent p-3 hover:border-border hover:bg-muted/40"
              >
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                  r.severity === "high" ? "bg-[color:var(--risk)]" :
                  r.severity === "medium" ? "bg-[color:var(--warning)]" : "bg-[color:var(--success)]"
                }`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{r.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.section} · Suggested owner: {r.owner}
                  </p>
                </div>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                  {r.severity}
                </span>
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
    </AppLayout>
  );
}

function KpiCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border bg-card p-5 shadow-card"
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      {children}
    </motion.div>
  );
}
