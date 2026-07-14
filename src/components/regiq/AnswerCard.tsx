import { motion } from "framer-motion";
import {
  Mail,
  Copy,
  Flag,
  CheckSquare,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AnswerData, Citation } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function AnswerCard({
  question,
  answer,
  onEmail,
  onCitationClick,
  onFlag,
  onCreateTask,
}: {
  question: string;
  answer: AnswerData;
  onEmail: () => void;
  onCitationClick: (c: Citation) => void;
  onFlag?: () => void;
  onCreateTask?: () => void;
}) {
  const copy = () => {
    void navigator.clipboard.writeText(
      `${answer.summary}\n\n${answer.bullets.map((b) => "• " + b).join("\n")}`,
    );
    toast.success("Answer copied to clipboard");
  };


  return (
    <div className="space-y-4">
      {/* Question bubble */}
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-gradient-brand px-4 py-3 text-sm text-white shadow-card">
          {question}
        </div>
      </div>

      {/* Answer card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-2xl border bg-card p-5 shadow-card"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[color:var(--brand-violet)]">
            <Sparkles className="h-3.5 w-3.5" /> RegIQ Analysis
          </div>
          <p className="text-sm leading-relaxed text-foreground">{answer.summary}</p>

          <ul className="space-y-2">
            {answer.bullets.map((b, i) => (
              <li key={i} className="flex gap-2 text-sm text-foreground/90">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--brand-cyan)]" />
                {b}
              </li>
            ))}
          </ul>
        </div>

        {/* Citations */}
        <div className="mt-5 border-t pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Sources referenced
          </p>
          <div className="flex flex-wrap gap-2">
            {answer.citations.map((c) => (
              <button
                key={c.id}
                onClick={() => onCitationClick(c)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all hover:-translate-y-0.5 hover:shadow-card",
                  c.type === "external"
                    ? "border-[color:var(--brand-violet)]/30 bg-[color:var(--brand-violet)]/10 text-[color:var(--brand-indigo)]"
                    : "border-[color:var(--brand-blue)]/30 bg-[color:var(--brand-blue)]/10 text-[color:var(--brand-blue)]",
                )}
              >
                <span className="rounded-sm bg-white/60 px-1 text-[9px] font-bold uppercase">
                  {c.type === "external" ? "EXT" : "INT"}
                </span>
                {c.issuer} · {c.section}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex flex-wrap gap-1.5 border-t pt-3">
          <ActionBtn onClick={onEmail} icon={<Mail className="h-3.5 w-3.5" />}>Email</ActionBtn>
          <ActionBtn onClick={copy} icon={<Copy className="h-3.5 w-3.5" />}>Copy</ActionBtn>
          <ActionBtn onClick={() => onFlag ? onFlag() : toast("Flagged for review")} icon={<Flag className="h-3.5 w-3.5" />}>Flag</ActionBtn>
          <ActionBtn onClick={() => onCreateTask ? onCreateTask() : toast.success("Task created")} icon={<CheckSquare className="h-3.5 w-3.5" />}>Create task</ActionBtn>

          <ActionBtn onClick={() => toast("Regenerating...")} icon={<RefreshCw className="h-3.5 w-3.5" />}>Regenerate</ActionBtn>
        </div>
      </motion.div>
    </div>
  );
}

function ActionBtn({
  children,
  icon,
  onClick,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Button variant="ghost" size="sm" onClick={onClick} className="gap-1.5 text-muted-foreground hover:text-[color:var(--brand-indigo)]">
      {icon}
      {children}
    </Button>
  );
}
