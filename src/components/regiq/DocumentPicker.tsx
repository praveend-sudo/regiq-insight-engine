import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { EXTERNAL_DOCS, INTERNAL_DOCS, type LinkedDoc } from "@/lib/doc-library";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, Link2, X } from "lucide-react";

/** Multi-select picker for linking external / internal regulatory documents. */
export function DocumentPicker({
  value,
  onChange,
  label = "Linked regulatory documents",
}: {
  value: LinkedDoc[];
  onChange: (docs: LinkedDoc[]) => void;
  label?: string;
}) {
  const [uploaded, setUploaded] = useState<LinkedDoc[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) return;
      const { data } = await supabase
        .from("uploaded_documents")
        .select("id, name, source_type, issuer")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(100);
      setUploaded(
        (data ?? []).map((d) => ({
          id: d.id as string,
          type: (d.source_type === "external" ? "external" : "internal") as LinkedDoc["type"],
          issuer: (d.issuer as string | null) ?? "Internal",
          title: d.name as string,
        })),
      );
    })();
  }, []);

  const all = useMemo(() => {
    const seen = new Set<string>();
    return [...EXTERNAL_DOCS, ...INTERNAL_DOCS, ...uploaded].filter((d) => {
      if (seen.has(d.id)) return false;
      seen.add(d.id);
      return true;
    });
  }, [uploaded]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return all;
    return all.filter((d) => `${d.issuer} ${d.title}`.toLowerCase().includes(s));
  }, [all, q]);

  const toggle = (doc: LinkedDoc) => {
    onChange(
      value.some((v) => v.id === doc.id)
        ? value.filter((v) => v.id !== doc.id)
        : [...value, doc],
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{label}</label>
        <Button type="button" size="sm" variant="ghost" className="gap-1.5" onClick={() => setOpen((o) => !o)}>
          <Link2 className="h-3.5 w-3.5" /> {open ? "Done" : "Link documents"}
        </Button>
      </div>

      {value.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {value.map((d) => (
            <span
              key={d.id}
              className="inline-flex items-center gap-1 rounded-full bg-gradient-brand-soft px-2.5 py-0.5 text-xs text-[color:var(--brand-indigo)]"
            >
              <span className="font-semibold">{d.issuer}</span> {d.title}
              <button type="button" onClick={() => toggle(d)} aria-label={`Remove ${d.title}`}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {open && (
        <div className="mt-2 rounded-xl border bg-card p-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search CBSL, SEC, CSE, IRD or internal policies…"
            className="h-8 text-sm"
          />
          <div className="mt-2 max-h-56 space-y-1 overflow-y-auto">
            {filtered.map((d) => {
              const selected = value.some((v) => v.id === d.id);
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => toggle(d)}
                  className={cn(
                    "flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors",
                    selected ? "bg-gradient-brand-soft/60" : "hover:bg-muted/50",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border",
                      selected
                        ? "border-[color:var(--brand-violet)] bg-[color:var(--brand-violet)] text-white"
                        : "border-muted-foreground/40",
                    )}
                  >
                    {selected && <Check className="h-3 w-3" />}
                  </span>
                  <span className="min-w-0">
                    <span className="font-medium">{d.title}</span>
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      {d.issuer} · {d.type}
                      {d.section ? ` · ${d.section}` : ""}
                    </span>
                  </span>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="px-2 py-3 text-sm text-muted-foreground">No documents match.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function LinkedDocsChips({ docs }: { docs: LinkedDoc[] }) {
  if (!docs?.length) return null;
  return (
    <div className="mt-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Linked documents
      </p>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {docs.map((d) => (
          <span
            key={d.id}
            className="rounded-full bg-gradient-brand-soft px-2.5 py-0.5 text-xs text-[color:var(--brand-indigo)]"
          >
            <span className="font-semibold">{d.issuer}</span> {d.title}
          </span>
        ))}
      </div>
    </div>
  );
}
