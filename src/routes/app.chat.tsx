import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/regiq/AppLayout";
import { AnswerCard } from "@/components/regiq/AnswerCard";
import { ReferencesPanel } from "@/components/regiq/ReferencesPanel";
import { EmailSummaryDialog } from "@/components/regiq/EmailSummaryDialog";
import {
  SUGGESTED_QUESTIONS,
  type ChatTurn,
  type Citation,
} from "@/lib/mock-data";
import { answerCompliance } from "@/lib/ai.functions";
import { exportChatToPdf } from "@/lib/pdf-export";
import { Send, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/chat")({
  component: ChatPage,
});

function ChatPage() {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [refsOpen, setRefsOpen] = useState(true);
  const [highlightedRef, setHighlightedRef] = useState<string | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const askAi = useServerFn(answerCompliance);

  const activeCitations = useMemo<Citation[]>(
    () => (turns.length ? turns[turns.length - 1].answer.citations : []),
    [turns],
  );

  const ask = async (q: string) => {
    if (!q.trim() || thinking) return;
    setInput("");
    setThinking(true);
    try {
      const history = turns.flatMap((t) => [
        { role: "user" as const, content: t.question },
        { role: "assistant" as const, content: t.answer.summary },
      ]);
      const ans = await askAi({ data: { question: q, history } });
      setTurns((prev) => [...prev, { id: crypto.randomUUID(), question: q, answer: ans }]);
      setRefsOpen(true);
      setTimeout(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      }, 100);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "AI request failed";
      toast.error(msg);
    } finally {
      setThinking(false);
    }
  };


  const onCitationClick = (c: Citation) => {
    setRefsOpen(true);
    setHighlightedRef(c.id);
    setTimeout(() => {
      document.getElementById(`ref-${c.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 200);
    setTimeout(() => setHighlightedRef(null), 1500);
  };

  const onDownloadPdf = () => {
    if (turns.length === 0) {
      toast.error("Ask a question first");
      return;
    }
    exportChatToPdf(turns);
    toast.success("PDF downloaded");
  };

  return (
    <AppLayout
      onEmailSummary={() => turns.length ? setEmailOpen(true) : toast.error("Ask a question first")}
      onDownloadPdf={onDownloadPdf}
      onNewChat={() => { setTurns([]); toast("New conversation started"); }}
      onToggleRefs={() => setRefsOpen((v) => !v)}
      refsOpen={refsOpen}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
          {turns.length === 0 ? (
            <EmptyState onPick={ask} />
          ) : (
            <div className="mx-auto max-w-3xl space-y-8">
              {turns.map((t) => (
                <AnswerCard
                  key={t.id}
                  question={t.question}
                  answer={t.answer}
                  onEmail={() => setEmailOpen(true)}
                  onCitationClick={onCitationClick}
                />
              ))}
              {thinking && <TypingIndicator />}
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="border-t bg-card/60 p-4 backdrop-blur">
          <div className="mx-auto max-w-3xl">
            {turns.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {SUGGESTED_QUESTIONS.slice(0, 2).map((q) => (
                  <button
                    key={q}
                    onClick={() => ask(q)}
                    className="rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground hover:border-[color:var(--brand-violet)] hover:text-[color:var(--brand-indigo)]"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
            <form
              onSubmit={(e) => { e.preventDefault(); ask(input); }}
              className="relative flex items-end gap-2 rounded-2xl border bg-background p-2 shadow-card focus-within:ring-2 focus-within:ring-[color:var(--brand-violet)]/40"
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(input); }
                }}
                rows={1}
                placeholder="Ask about CBSL, SEC, CSE, IRD or your internal policies..."
                className="min-h-[40px] max-h-40 flex-1 resize-none bg-transparent px-3 py-2 text-sm outline-none"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-brand text-white disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </div>

      <ReferencesPanel
        citations={activeCitations}
        open={refsOpen && turns.length > 0}
        onClose={() => setRefsOpen(false)}
        highlightedId={highlightedRef}
      />

      <EmailSummaryDialog
        open={emailOpen}
        onOpenChange={setEmailOpen}
        defaultSubject={turns.length ? `RegIQ Answer: ${turns[turns.length - 1].question.slice(0, 60)}` : "RegIQ Answer"}
        defaultBody={turns.length ? turns[turns.length - 1].answer.summary : ""}
      />
    </AppLayout>
  );
}

function EmptyState({ onPick }: { onPick: (q: string) => void }) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 pt-16 text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-brand shadow-glow"
      >
        <Sparkles className="h-8 w-8 text-white" />
      </motion.div>
      <div>
        <h2 className="text-2xl font-bold">Ask a compliance question</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          RegIQ searches 4,000+ regulatory circulars and your internal policies to produce a cited, gap-aware answer.
        </p>
      </div>
      <div className="grid w-full gap-2 sm:grid-cols-2">
        {SUGGESTED_QUESTIONS.map((q) => (
          <button
            key={q}
            onClick={() => onPick(q)}
            className="rounded-xl border bg-card p-4 text-left text-sm text-foreground/80 shadow-card transition-all hover:-translate-y-0.5 hover:border-[color:var(--brand-violet)] hover:text-[color:var(--brand-indigo)]"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-3 rounded-2xl border bg-card px-4 py-3 shadow-card">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-2 w-2 rounded-full bg-[color:var(--brand-violet)]"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
      <span className="text-sm text-muted-foreground">
        Searching 4,000+ regulatory & internal documents…
      </span>
    </div>
  );
}
