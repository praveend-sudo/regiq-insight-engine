import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { AppLayout } from "@/components/regiq/AppLayout";
import { INSIGHT_KPIS, REGULATORY_TIMELINE } from "@/lib/mock-data";
import { ConfidenceRing } from "@/components/regiq/ConfidenceRing";
import { CalendarClock, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/app/insights")({
  component: InsightsPage,
});

const CHART_COLORS = ["#5B21B6", "#8B5CF6", "#2563EB", "#17C3E8"];

function InsightsPage() {
  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-6xl overflow-y-auto px-4 py-8 md:px-8">
        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-3">
          <KpiCard title="Compliance Score">
            <div className="flex items-center justify-center py-2">
              <ConfidenceRing value={INSIGHT_KPIS.score} size={120} />
            </div>
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
        <div className="mt-6 rounded-2xl border bg-card p-5 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Regulatory Changes by Regulator</h3>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-[color:var(--brand-cyan)]" />
              Last 6 months
            </span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
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
