import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, FileText, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Citation } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const ISSUER_STYLES: Record<string, string> = {
  CBSL: "bg-[color:var(--brand-indigo)] text-white",
  SEC: "bg-[color:var(--brand-violet)] text-white",
  CSE: "bg-[color:var(--brand-blue)] text-white",
  IRD: "bg-fuchsia-600 text-white",
  Internal: "bg-sky-500 text-white",
};

export function IssuerBadge({ issuer }: { issuer: string }) {
  const cls = ISSUER_STYLES[issuer] ?? "bg-muted text-foreground";
  return (
    <div
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
        cls,
      )}
    >
      {issuer.slice(0, 3).toUpperCase()}
    </div>
  );
}

export function ReferencesPanel({
  citations,
  open,
  onClose,
  highlightedId,
}: {
  citations: Citation[];
  open: boolean;
  onClose: () => void;
  highlightedId?: string | null;
}) {
  const external = citations.filter((c) => c.type === "external");
  const internal = citations.filter((c) => c.type === "internal");

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          key="refs"
          initial={{ x: 420, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 420, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 30 }}
          className="hidden lg:flex w-[380px] shrink-0 flex-col border-l bg-card"
        >
          <div className="flex items-center justify-between border-b p-4">
            <div>
              <h3 className="text-sm font-semibold">References</h3>
              <p className="text-xs text-muted-foreground">
                {citations.length} documents cited
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {external.length > 0 && (
              <Section title="External Regulations" icon={<Building2 className="h-3.5 w-3.5" />}>
                {external.map((c) => (
                  <RefCard key={c.id} c={c} highlighted={c.id === highlightedId} />
                ))}
              </Section>
            )}
            {internal.length > 0 && (
              <Section title="Internal Policies" icon={<FileText className="h-3.5 w-3.5" />}>
                {internal.map((c) => (
                  <RefCard key={c.id} c={c} highlighted={c.id === highlightedId} />
                ))}
              </Section>
            )}
            {citations.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Ask a question — references will appear here.
              </p>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {title}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function RefCard({ c, highlighted }: { c: Citation; highlighted?: boolean }) {
  return (
    <motion.div
      id={`ref-${c.id}`}
      animate={
        highlighted
          ? { scale: [1, 1.02, 1], boxShadow: "0 0 0 2px var(--brand-cyan)" }
          : { scale: 1 }
      }
      transition={{ duration: 0.6 }}
      className={cn(
        "rounded-xl border bg-background p-3 transition-shadow hover:shadow-card",
        highlighted && "ring-2 ring-[color:var(--brand-cyan)]",
      )}
    >
      <div className="flex gap-3">
        <IssuerBadge issuer={c.issuer} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight line-clamp-2">{c.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {c.section} · {c.date}
          </p>
        </div>
      </div>
      <p className="mt-3 rounded-md bg-muted/50 p-2 text-xs italic leading-relaxed text-foreground/80">
        "{c.excerpt}"
      </p>
      <button className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[color:var(--brand-blue)] hover:underline">
        Open full document <ExternalLink className="h-3 w-3" />
      </button>
    </motion.div>
  );
}
