import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppLayout } from "@/components/regiq/AppLayout";
import { SEED_NOTIFICATIONS } from "@/lib/mock-data";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { IssuerBadge } from "@/components/regiq/ReferencesPanel";
import { Mail, MessageSquareText, Bell } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/notifications")({
  component: NotificationsPage,
});

type Notif = {
  id: string;
  title: string;
  summary: string;
  impact: string;
  issuer: string;
  linked: string[];
  ai_insight: string | null;
  read: boolean;
  created_at: string;
};

function NotificationsPage() {
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) { setLoading(false); return; }

      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false });

      if (!data || data.length === 0) {
        // seed
        const rows = SEED_NOTIFICATIONS.map((n) => ({ ...n, user_id: uid }));
        await supabase.from("notifications").insert(rows);
        const { data: fresh } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", uid)
          .order("created_at", { ascending: false });
        setItems((fresh ?? []) as unknown as Notif[]);
      } else {
        setItems(data as unknown as Notif[]);
      }
      setLoading(false);
    })();
  }, []);

  const markRead = async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await supabase.from("notifications").update({ read: true }).eq("id", id);
  };

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-4xl overflow-y-auto px-4 py-8 md:px-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-brand text-white shadow-glow">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Smart Notifications</h2>
            <p className="text-sm text-muted-foreground">
              AI-summarized updates from regulators and internal document uploads.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence initial={false}>
              {items.map((n, i) => (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => !n.read && markRead(n.id)}
                  className="rounded-2xl border bg-card p-5 shadow-card"
                >
                  <div className="flex items-start gap-3">
                    <IssuerBadge issuer={n.issuer} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold leading-tight">{n.title}</h3>
                        <ImpactPill impact={n.impact} />
                      </div>
                      <p className="mt-2 text-sm text-foreground/80">{n.summary}</p>

                      {n.linked?.length > 0 && (
                        <div className="mt-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Linked regulations & internal policies
                          </p>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {n.linked.map((l, idx) => (
                              <span
                                key={idx}
                                className="rounded-full bg-gradient-brand-soft px-2.5 py-0.5 text-xs text-[color:var(--brand-indigo)]"
                              >
                                {l}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {n.ai_insight && (
                        <div className="mt-3 rounded-lg border border-[color:var(--brand-cyan)]/30 bg-[color:var(--brand-cyan)]/5 p-3 text-sm">
                          <span className="font-semibold text-[color:var(--brand-blue)]">AI Insight: </span>
                          {n.ai_insight}
                        </div>
                      )}

                      <div className="mt-4 flex flex-wrap gap-1.5">
                        <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => toast.success("Summary email drafted")}>
                          <Mail className="h-3.5 w-3.5" /> Email summary
                        </Button>
                        <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => toast("Gap analysis started")}>
                          <ScanSearch className="h-3.5 w-3.5" /> Run gap analysis
                        </Button>
                        <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => toast("Opening chat with context...")}>
                          <MessageSquareText className="h-3.5 w-3.5" /> Ask about this
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function ImpactPill({ impact }: { impact: string }) {
  const s = impact.toLowerCase();
  const cls =
    s === "high"
      ? "bg-[color:var(--risk)]/10 text-[color:var(--risk)] border-[color:var(--risk)]/30"
      : s === "medium"
        ? "bg-[color:var(--warning)]/10 text-[color:var(--warning)] border-[color:var(--warning)]/30"
        : "bg-[color:var(--success)]/10 text-[color:var(--success)] border-[color:var(--success)]/30";
  return (
    <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${cls}`}>
      {impact} impact
    </span>
  );
}
