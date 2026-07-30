import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppLayout } from "@/components/regiq/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { listTasks, type TaskRow } from "@/lib/tasks.functions";
import {
  listObligations,
  createObligation,
  updateObligation,
  deleteObligation,
  completeObligation,
} from "@/lib/obligations.functions";
import {
  EVENT_STYLE,
  FREQUENCIES,
  FREQUENCY_LABEL,
  expandOccurrences,
  parseISODate,
  toISODate,
  type EventKind,
  type Frequency,
  type ObligationRow,
} from "@/lib/schedule";
import { EmailSummaryDialog } from "@/components/regiq/EmailSummaryDialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Bell,
  Mail,
  Trash2,
  Check,
  Pencil,
} from "lucide-react";

export const Route = createFileRoute("/app/calendar")({
  component: CalendarPage,
  head: () => ({
    meta: [
      { title: "Compliance Calendar | RegIQ" },
      {
        name: "description",
        content:
          "Track task target dates and recurring regulatory or internal reporting deadlines on one colour-coded RegIQ compliance calendar.",
      },
      { property: "og:title", content: "Compliance Calendar | RegIQ" },
      {
        property: "og:description",
        content: "Colour-coded deadlines for tasks, regulator submissions and internal reports.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type CalEvent = {
  id: string;
  date: string;
  title: string;
  kind: EventKind;
  meta: string;
  task?: TaskRow;
  obligation?: ObligationRow;
};

function CalendarPage() {
  const [me, setMe] = useState<string | null>(null);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [obs, setObs] = useState<ObligationRow[]>([]);
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selected, setSelected] = useState<string | null>(toISODate(new Date()));
  const [showNew, setShowNew] = useState(false);
  const [editOb, setEditOb] = useState<ObligationRow | null>(null);
  const [email, setEmail] = useState<{ subject: string; body: string } | null>(null);

  const fnTasks = useServerFn(listTasks);
  const fnObs = useServerFn(listObligations);
  const fnCreate = useServerFn(createObligation);
  const fnUpdate = useServerFn(updateObligation);
  const fnDelete = useServerFn(deleteObligation);
  const fnComplete = useServerFn(completeObligation);

  const load = async () => {
    try {
      const [t, o] = await Promise.all([fnTasks(), fnObs()]);
      setTasks(t as TaskRow[]);
      setObs(o as ObligationRow[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load calendar");
    }
  };

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const monthStart = toISODate(new Date(cursor.getFullYear(), cursor.getMonth(), 1));
  const monthEnd = toISODate(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0));

  const events = useMemo<CalEvent[]>(() => {
    const out: CalEvent[] = [];
    for (const t of tasks) {
      if (!t.due_date) continue;
      if (t.due_date < monthStart || t.due_date > monthEnd) continue;
      const kind: EventKind =
        me && t.user_id === me && t.assigned_to && t.assigned_to !== me
          ? "assigned_by_me"
          : "assigned_to_me";
      out.push({
        id: `task-${t.id}`,
        date: t.due_date,
        title: t.title,
        kind,
        meta:
          kind === "assigned_by_me"
            ? `Assigned to ${t.assignee_name ?? "teammate"}`
            : `Task · ${t.status.replace("_", " ")}`,
        task: t,
      });
    }
    for (const ob of obs) {
      if (!ob.active) continue;
      for (const d of expandOccurrences(ob, monthStart, monthEnd)) {
        out.push({
          id: `ob-${ob.id}-${d}`,
          date: d,
          title: ob.title,
          kind: ob.audience === "regulator" ? "regulator" : "internal",
          meta: `${FREQUENCY_LABEL[ob.frequency]} · ${ob.issuer ?? (ob.source_type === "internal" ? "Internal policy" : "Regulation")}`,
          obligation: ob,
        });
      }
    }
    return out.sort((a, b) => a.date.localeCompare(b.date));
  }, [tasks, obs, me, monthStart, monthEnd]);

  const byDate = useMemo(() => {
    const m = new Map<string, CalEvent[]>();
    for (const e of events) m.set(e.date, [...(m.get(e.date) ?? []), e]);
    return m;
  }, [events]);

  const cells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const arr: (string | null)[] = Array.from({ length: startPad }, () => null);
    for (let d = 1; d <= daysInMonth; d++) {
      arr.push(toISODate(new Date(cursor.getFullYear(), cursor.getMonth(), d)));
    }
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [cursor]);

  const selectedEvents = selected ? (byDate.get(selected) ?? []) : [];
  const todayISO = toISODate(new Date());

  const saveObligation = async (payload: ObligationInput, id?: string) => {
    try {
      if (id) {
        const row = (await fnUpdate({ data: { id, ...payload } })) as ObligationRow;
        setObs((p) => p.map((o) => (o.id === id ? row : o)));
        toast.success("Schedule updated");
      } else {
        const row = (await fnCreate({ data: payload })) as ObligationRow;
        setObs((p) => [...p, row]);
        toast.success("Reporting schedule added");
      }
      setShowNew(false);
      setEditOb(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-6xl overflow-y-auto px-4 py-8 md:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-brand text-white shadow-glow">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Compliance Calendar</h2>
              <p className="text-sm text-muted-foreground">
                Task target dates plus periodic regulator and internal reporting deadlines.
              </p>
            </div>
          </div>
          <Button onClick={() => setShowNew(true)} className="gap-1.5 bg-gradient-brand text-white">
            <Plus className="h-4 w-4" /> Reporting schedule
          </Button>
        </div>

        {/* Legend */}
        <div className="mb-4 flex flex-wrap gap-3 rounded-xl border bg-card p-3 text-xs">
          {(Object.keys(EVENT_STYLE) as EventKind[]).map((k) => (
            <span key={k} className="inline-flex items-center gap-1.5">
              <span className={cn("h-2.5 w-2.5 rounded-full", EVENT_STYLE[k].dot)} />
              {EVENT_STYLE[k].label}
            </span>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="rounded-2xl border bg-card p-4 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <p className="font-semibold">
                {cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
              </p>
              <Button variant="ghost" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="py-1">{d}</div>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {cells.map((iso, i) => {
                if (!iso) return <div key={`p${i}`} className="min-h-[86px] rounded-lg bg-muted/20" />;
                const evs = byDate.get(iso) ?? [];
                return (
                  <button
                    key={iso}
                    onClick={() => setSelected(iso)}
                    className={cn(
                      "min-h-[86px] rounded-lg border p-1.5 text-left transition-colors hover:border-[color:var(--brand-violet)]/50",
                      selected === iso ? "border-[color:var(--brand-violet)] bg-gradient-brand-soft/40" : "bg-background",
                      iso === todayISO && "ring-1 ring-[color:var(--brand-cyan)]",
                    )}
                  >
                    <span className={cn("text-xs font-semibold", iso === todayISO && "text-[color:var(--brand-blue)]")}>
                      {parseISODate(iso).getDate()}
                    </span>
                    <div className="mt-1 space-y-1">
                      {evs.slice(0, 3).map((e) => (
                        <div
                          key={e.id}
                          className={cn(
                            "truncate rounded border px-1 py-0.5 text-[10px] font-medium",
                            EVENT_STYLE[e.kind].chip,
                            EVENT_STYLE[e.kind].text,
                          )}
                        >
                          {e.title}
                        </div>
                      ))}
                      {evs.length > 3 && (
                        <div className="text-[10px] text-muted-foreground">+{evs.length - 3} more</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Day detail */}
          <div className="rounded-2xl border bg-card p-4 shadow-card">
            <p className="text-sm font-semibold">
              {selected ? parseISODate(selected).toLocaleDateString(undefined, { dateStyle: "full" }) : "Pick a day"}
            </p>
            {selectedEvents.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Nothing scheduled.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {selectedEvents.map((e) => (
                  <div key={e.id} className={cn("rounded-xl border p-3", EVENT_STYLE[e.kind].chip)}>
                    <div className="flex items-start gap-2">
                      <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", EVENT_STYLE[e.kind].dot)} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{e.title}</p>
                        <p className="text-xs text-muted-foreground">{e.meta}</p>
                        {e.obligation && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 gap-1 px-2 text-xs"
                              onClick={() =>
                                setEmail({
                                  subject: `Reminder: ${e.title} due ${e.date}`,
                                  body: `Reminder: "${e.title}" is due on ${e.date}.\n\n${e.obligation?.description ?? ""}\n\nRecipients: ${(e.obligation?.recipients ?? []).join(", ") || "—"}`,
                                })
                              }
                            >
                              <Mail className="h-3 w-3" /> Email
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 gap-1 px-2 text-xs"
                              onClick={() => setEditOb(e.obligation!)}
                            >
                              <Pencil className="h-3 w-3" /> Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 gap-1 px-2 text-xs"
                              onClick={async () => {
                                const row = (await fnComplete({ data: { id: e.obligation!.id } })) as ObligationRow;
                                setObs((p) => p.map((o) => (o.id === row.id ? row : o)));
                                toast.success("Marked filed — next cycle scheduled");
                              }}
                            >
                              <Check className="h-3 w-3" /> Filed
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 gap-1 px-2 text-xs"
                              onClick={async () => {
                                if (!confirm("Delete this reporting schedule?")) return;
                                await fnDelete({ data: { id: e.obligation!.id } });
                                setObs((p) => p.filter((o) => o.id !== e.obligation!.id));
                              }}
                            >
                              <Trash2 className="h-3 w-3" /> Delete
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5 border-t pt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Reporting schedules
              </p>
              <div className="mt-2 space-y-1.5">
                {obs.length === 0 && (
                  <p className="text-xs text-muted-foreground">None yet — add one to populate the calendar.</p>
                )}
                {obs.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => { setSelected(o.next_due_date); setCursor(new Date(parseISODate(o.next_due_date).getFullYear(), parseISODate(o.next_due_date).getMonth(), 1)); }}
                    className="flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-xs hover:bg-muted/40"
                  >
                    <span className={cn("h-2 w-2 shrink-0 rounded-full", EVENT_STYLE[o.audience === "regulator" ? "regulator" : "internal"].dot)} />
                    <span className="min-w-0 flex-1 truncate">{o.title}</span>
                    <span className="shrink-0 text-muted-foreground">{o.next_due_date}</span>
                  </button>
                ))}
              </div>
              <p className="mt-3 flex items-start gap-1.5 text-[11px] text-muted-foreground">
                <Bell className="mt-0.5 h-3 w-3 shrink-0" />
                In-app reminders are raised automatically inside each schedule's lead time; use Email to send the same reminder to recipients.
              </p>
            </div>
          </div>
        </div>
      </div>

      <ObligationDialog
        open={showNew || !!editOb}
        initial={editOb}
        onClose={() => { setShowNew(false); setEditOb(null); }}
        onSave={(payload) => saveObligation(payload, editOb?.id)}
      />
      <EmailSummaryDialog
        open={!!email}
        onOpenChange={(v) => { if (!v) setEmail(null); }}
        title="Email reminder"
        defaultSubject={email?.subject ?? ""}
        defaultBody={email?.body ?? ""}
      />
    </AppLayout>
  );
}

type ObligationInput = {
  title: string;
  description: string | null;
  source_type: "internal" | "external";
  issuer: string | null;
  audience: "regulator" | "internal";
  frequency: Frequency;
  next_due_date: string;
  lead_days: number;
  recipients: string[];
};

function ObligationDialog({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: ObligationRow | null;
  onClose: () => void;
  onSave: (payload: ObligationInput) => void;
}) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [sourceType, setSourceType] = useState<"internal" | "external">("external");
  const [issuer, setIssuer] = useState("");
  const [audience, setAudience] = useState<"regulator" | "internal">("regulator");
  const [freq, setFreq] = useState<Frequency>("monthly");
  const [due, setDue] = useState(toISODate(new Date()));
  const [lead, setLead] = useState("7");
  const [recips, setRecips] = useState("");

  useEffect(() => {
    if (!open) return;
    setTitle(initial?.title ?? "");
    setDesc(initial?.description ?? "");
    setSourceType(initial?.source_type ?? "external");
    setIssuer(initial?.issuer ?? "");
    setAudience(initial?.audience ?? "regulator");
    setFreq(initial?.frequency ?? "monthly");
    setDue(initial?.next_due_date ?? toISODate(new Date()));
    setLead(String(initial?.lead_days ?? 7));
    setRecips((initial?.recipients ?? []).join(", "));
  }, [open, initial]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit reporting schedule" : "New reporting schedule"}</DialogTitle>
          <DialogDescription>
            Periodic reports or notifications owed to a regulator or to internal staff.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., CBSL monthly liquidity return" />
          </div>
          <div>
            <label className="text-sm font-medium">Details</label>
            <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What must be submitted, under which direction/policy" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Driven by</label>
              <Select value={sourceType} onValueChange={(v) => setSourceType(v as "internal" | "external")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="external">External regulation</SelectItem>
                  <SelectItem value="internal">Internal policy</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Send to</label>
              <Select value={audience} onValueChange={(v) => setAudience(v as "regulator" | "internal")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="regulator">Regulator</SelectItem>
                  <SelectItem value="internal">Internal staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Issuer / owner</label>
              <Input value={issuer} onChange={(e) => setIssuer(e.target.value)} placeholder="CBSL, SEC, CSE, IRD…" />
            </div>
            <div>
              <label className="text-sm font-medium">Frequency</label>
              <Select value={freq} onValueChange={(v) => setFreq(v as Frequency)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((f) => (
                    <SelectItem key={f} value={f}>{FREQUENCY_LABEL[f]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Next due date</label>
              <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Remind (days before)</label>
              <Input type="number" min={0} max={120} value={lead} onChange={(e) => setLead(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Recipient emails</label>
            <Input value={recips} onChange={(e) => setRecips(e.target.value)} placeholder="reporting@cbsl.lk, risk@bank.lk" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            className="bg-gradient-brand text-white"
            disabled={!title.trim() || !due}
            onClick={() =>
              onSave({
                title: title.trim(),
                description: desc.trim() || null,
                source_type: sourceType,
                issuer: issuer.trim() || null,
                audience,
                frequency: freq,
                next_due_date: due,
                lead_days: Number(lead) || 0,
                recipients: recips
                  .split(",")
                  .map((s) => s.trim())
                  .filter((s) => s.includes("@")),
              })
            }
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
