import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
import { EmailSummaryDialog } from "@/components/regiq/EmailSummaryDialog";
import {
  listMemos,
  generateMemo,
  updateMemo,
  deleteMemo,
  type MemoRow,
} from "@/lib/memos.functions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { FileText, Sparkles, Mail, Trash2, Save, Loader2 } from "lucide-react";

export const Route = createFileRoute("/app/memos")({
  component: MemosPage,
  head: () => ({
    meta: [
      { title: "Regulatory Change Memos | RegIQ" },
      {
        name: "description",
        content:
          "Draft, edit and email internal memoranda about CBSL, SEC, CSE and IRD regulatory changes with AI assistance.",
      },
      { property: "og:title", content: "Regulatory Change Memos | RegIQ" },
      {
        property: "og:description",
        content: "AI-drafted, fully editable internal memos for Sri Lankan regulatory changes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function MemosPage() {
  const [memos, setMemos] = useState<MemoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [active, setActive] = useState<MemoRow | null>(null);
  const [emailMemo, setEmailMemo] = useState<MemoRow | null>(null);

  const fnList = useServerFn(listMemos);
  const fnGen = useServerFn(generateMemo);
  const fnUpdate = useServerFn(updateMemo);
  const fnDelete = useServerFn(deleteMemo);

  useEffect(() => {
    void (async () => {
      try {
        setMemos((await fnList()) as MemoRow[]);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load memos");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onGenerate = async (change: string, issuer: string, audience: string) => {
    setGenerating(true);
    try {
      const row = (await fnGen({ data: { change, issuer: issuer || undefined, audience: audience || undefined } })) as MemoRow;
      setMemos((p) => [row, ...p]);
      setActive(row);
      setShowNew(false);
      toast.success("Memo drafted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not draft the memo");
    } finally {
      setGenerating(false);
    }
  };

  const onSave = async (memo: MemoRow, title: string, body: string) => {
    try {
      const row = (await fnUpdate({ data: { id: memo.id, title, body } })) as MemoRow;
      setMemos((p) => p.map((m) => (m.id === row.id ? row : m)));
      setActive(row);
      toast.success("Memo saved");
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
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Regulatory Change Memos</h2>
              <p className="text-sm text-muted-foreground">
                Draft a memo with AI, edit it, then email it to any recipient.
              </p>
            </div>
          </div>
          <Button onClick={() => setShowNew(true)} className="gap-1.5 bg-gradient-brand text-white">
            <Sparkles className="h-4 w-4" /> Draft with AI
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
          <div className="space-y-2">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : memos.length === 0 ? (
              <div className="rounded-2xl border border-dashed bg-card/50 p-6 text-center text-sm text-muted-foreground">
                No memos yet. Draft one from a regulatory change.
              </div>
            ) : (
              memos.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setActive(m)}
                  className={cn(
                    "w-full rounded-xl border bg-card p-3 text-left shadow-card transition-colors",
                    active?.id === m.id
                      ? "border-[color:var(--brand-violet)] bg-gradient-brand-soft/40"
                      : "hover:bg-muted/40",
                  )}
                >
                  <p className="truncate text-sm font-semibold">{m.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {m.issuer ? `${m.issuer} · ` : ""}
                    {new Date(m.created_at).toLocaleDateString()}
                    {m.status === "sent" ? " · sent" : ""}
                  </p>
                </button>
              ))
            )}
          </div>

          <div>
            {active ? (
              <MemoEditor
                key={active.id}
                memo={active}
                onSave={onSave}
                onEmail={() => setEmailMemo(active)}
                onDelete={async () => {
                  if (!confirm("Delete this memo?")) return;
                  await fnDelete({ data: { id: active.id } });
                  setMemos((p) => p.filter((m) => m.id !== active.id));
                  setActive(null);
                }}
              />
            ) : (
              <div className="rounded-2xl border border-dashed bg-card/50 p-10 text-center">
                <p className="font-semibold">Select or draft a memo</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Describe a regulatory change and RegIQ writes the first draft.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <NewMemoDialog open={showNew} busy={generating} onOpenChange={setShowNew} onGenerate={onGenerate} />
      <EmailSummaryDialog
        open={!!emailMemo}
        onOpenChange={async (v) => {
          if (!v && emailMemo) {
            const row = (await fnUpdate({
              data: { id: emailMemo.id, status: "sent", sent_at: new Date().toISOString() },
            })) as MemoRow;
            setMemos((p) => p.map((m) => (m.id === row.id ? row : m)));
            setActive((a) => (a && a.id === row.id ? row : a));
            setEmailMemo(null);
          }
        }}
        title="Email memo"
        description="Opens your mail client with the memo pre-filled for a specific address."
        defaultSubject={emailMemo ? `Memo: ${emailMemo.title}` : ""}
        defaultBody={emailMemo?.body ?? ""}
      />
    </AppLayout>
  );
}

function MemoEditor({
  memo,
  onSave,
  onEmail,
  onDelete,
}: {
  memo: MemoRow;
  onSave: (memo: MemoRow, title: string, body: string) => void;
  onEmail: () => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(memo.title);
  const [body, setBody] = useState(memo.body);
  const dirty = title !== memo.title || body !== memo.body;

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-card">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="text-base font-semibold"
      />
      {memo.change_summary && (
        <div className="mt-3 rounded-lg border-l-2 border-[color:var(--brand-violet)] bg-gradient-brand-soft/40 p-2 text-xs text-muted-foreground">
          <span className="font-semibold text-[color:var(--brand-indigo)]">Regulatory change:</span>{" "}
          {memo.change_summary}
        </div>
      )}
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        className="mt-3 min-h-[420px] font-mono text-sm leading-relaxed"
      />
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <Button variant="ghost" className="gap-1.5" onClick={onDelete}>
          <Trash2 className="h-4 w-4" /> Delete
        </Button>
        <Button variant="outline" className="gap-1.5" onClick={onEmail}>
          <Mail className="h-4 w-4" /> Email memo
        </Button>
        <Button
          className="gap-1.5 bg-gradient-brand text-white"
          disabled={!dirty}
          onClick={() => onSave(memo, title.trim(), body)}
        >
          <Save className="h-4 w-4" /> Save
        </Button>
      </div>
    </div>
  );
}

function NewMemoDialog({
  open,
  busy,
  onOpenChange,
  onGenerate,
}: {
  open: boolean;
  busy: boolean;
  onOpenChange: (v: boolean) => void;
  onGenerate: (change: string, issuer: string, audience: string) => void;
}) {
  const [change, setChange] = useState("");
  const [issuer, setIssuer] = useState("");
  const [audience, setAudience] = useState("");
  useEffect(() => {
    if (!open) { setChange(""); setIssuer(""); setAudience(""); }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Draft a memo with AI</DialogTitle>
          <DialogDescription>
            Describe the regulatory change; RegIQ writes an internal memorandum you can edit.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Regulatory change</label>
            <Textarea
              value={change}
              onChange={(e) => setChange(e.target.value)}
              rows={5}
              placeholder="e.g., CBSL revised the Technology Risk Management Direction to require 12-hour cyber incident reporting"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Issuer</label>
            <Input value={issuer} onChange={(e) => setIssuer(e.target.value)} placeholder="CBSL / SEC / CSE / IRD" />
          </div>
          <div>
            <label className="text-sm font-medium">Audience</label>
            <Input value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="Senior Management and Compliance Committee" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            className="gap-1.5 bg-gradient-brand text-white"
            disabled={change.trim().length < 3 || busy}
            onClick={() => onGenerate(change.trim(), issuer.trim(), audience.trim())}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {busy ? "Drafting…" : "Draft memo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
