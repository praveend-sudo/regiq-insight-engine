import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { AppLayout } from "@/components/regiq/AppLayout";
import { AnswerCard } from "@/components/regiq/AnswerCard";
import { ReferencesPanel } from "@/components/regiq/ReferencesPanel";
import { EmailSummaryDialog } from "@/components/regiq/EmailSummaryDialog";
import { ShareChatDialog } from "@/components/regiq/ShareChatDialog";

import {
  SUGGESTED_QUESTIONS,
  type AnswerData,
  type ChatTurn,
  type Citation,
} from "@/lib/mock-data";
import { answerCompliance } from "@/lib/ai.functions";
import { createTask, createFlagged } from "@/lib/tasks.functions";
import {
  createChat,
  getChatTurns,
  appendChatTurn,
  renameChat,
} from "@/lib/chats.functions";
import { exportChatToPdf } from "@/lib/pdf-export";
import { Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useProjectsChats } from "@/hooks/use-projects-chats";

const chatSearchSchema = z.object({
  chatId: fallback(z.string().optional(), undefined),
  newIn: fallback(z.string().optional(), undefined),
});

export const Route = createFileRoute("/app/chat")({
  validateSearch: zodValidator(chatSearchSchema),
  component: ChatPage,
});

function ChatPage() {
  const { chatId, newIn } = Route.useSearch();
  const navigate = useNavigate();

  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [refsOpen, setRefsOpen] = useState(true);
  const [highlightedRef, setHighlightedRef] = useState<string | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const [emailContent, setEmailContent] = useState<{ subject: string; body: string; title: string }>(
    { subject: "", body: "", title: "Email compliance summary" },
  );
  const scrollRef = useRef<HTMLDivElement>(null);

  const askAi = useServerFn(answerCompliance);
  const fnCreateTask = useServerFn(createTask);
  const fnCreateFlag = useServerFn(createFlagged);
  const fnCreateChat = useServerFn(createChat);
  const fnGetTurns = useServerFn(getChatTurns);
  const fnAppendTurn = useServerFn(appendChatTurn);
  const fnRenameChat = useServerFn(renameChat);
  const { refresh } = useProjectsChats();

  const activeCitations = useMemo<Citation[]>(
    () => (turns.length ? turns[turns.length - 1].answer.citations : []),
    [turns],
  );

  // Load history when chatId changes
  useEffect(() => {
    if (!chatId) {
      setTurns([]);
      return;
    }
    (async () => {
      try {
        const rows = await fnGetTurns({ data: { chat_id: chatId } });
        const rebuilt: ChatTurn[] = [];
        let pendingQ: string | null = null;
        for (const r of rows) {
          if (r.role === "user") {
            pendingQ = (r.content as { text?: string })?.text ?? "";
          } else if (r.role === "assistant" && pendingQ !== null) {
            rebuilt.push({
              id: r.id,
              question: pendingQ,
              answer: r.content as AnswerData,
            });
            pendingQ = null;
          }
        }
        setTurns(rebuilt);
        setRefsOpen(rebuilt.length > 0);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load chat");
      }
    })();
  }, [chatId, fnGetTurns]);

  const formatTurn = (t: ChatTurn) =>
    [
      `Q: ${t.question}`, ``,
      `A: ${t.answer.summary}`, ``,
      ...t.answer.bullets.map((b) => `• ${b}`), ``,
      `Confidence: ${t.answer.confidence}%`, ``,
      `Sources:`,
      ...t.answer.citations.map(
        (c) => `- [${c.type === "external" ? "EXT" : "INT"}] ${c.issuer} · ${c.title} — ${c.section}`,
      ),
    ].join("\n");

  const openEmailForTurn = (t: ChatTurn) => {
    setEmailContent({
      title: "Email this answer",
      subject: `RegIQ Answer: ${t.question.slice(0, 80)}`,
      body: formatTurn(t),
    });
    setEmailOpen(true);
  };

  const openEmailForChat = () => {
    if (turns.length === 0) { toast.error("Ask a question first"); return; }
    setEmailContent({
      title: "Email full chat",
      subject: `RegIQ Chat Summary (${turns.length} question${turns.length === 1 ? "" : "s"})`,
      body: turns.map(formatTurn).join("\n\n----------\n\n"),
    });
    setEmailOpen(true);
  };

  const ask = async (q: string) => {
    if (!q.trim() || thinking) return;
    setInput("");
    setThinking(true);
    try {
      let currentChatId = chatId;
      let createdNew = false;
      if (!currentChatId) {
        const created = await fnCreateChat({
          data: { title: q.slice(0, 60), project_id: newIn ?? null },
        });
        currentChatId = created.id;
        createdNew = true;
        // Reflect in URL (removes newIn, adds chatId)
        navigate({ to: "/app/chat", search: { chatId: created.id }, replace: true });
      }

      const history = turns.flatMap((t) => [
        { role: "user" as const, content: t.question },
        { role: "assistant" as const, content: t.answer.summary },
      ]);
      const ans = await askAi({ data: { question: q, history } });
      const newTurn: ChatTurn = { id: crypto.randomUUID(), question: q, answer: ans };
      setTurns((prev) => [...prev, newTurn]);
      setRefsOpen(true);

      await fnAppendTurn({ data: { chat_id: currentChatId, turn: newTurn } });
      if (!createdNew && turns.length === 0) {
        await fnRenameChat({ data: { id: currentChatId, title: q.slice(0, 60) } }).catch(() => {});
      }
      await refresh();

      setTimeout(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      }, 100);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI request failed");
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
    if (turns.length === 0) { toast.error("Ask a question first"); return; }
    exportChatToPdf(turns);
    toast.success("PDF downloaded");
  };

  const startNewChat = () => {
    navigate({ to: "/app/chat", search: {} });
    setTurns([]);
    setInput("");
  };

  return (
    <AppLayout
      onEmailSummary={openEmailForChat}
      onDownloadPdf={onDownloadPdf}
      onNewChat={startNewChat}
      onShareChat={chatId ? () => setShareOpen(true) : undefined}
      onToggleRefs={() => setRefsOpen((v) => !v)}
      refsOpen={refsOpen}
    >

      <div className="flex min-w-0 flex-1 flex-col">
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
          {turns.length === 0 ? (
            <EmptyState onPick={ask} newInProject={newIn ?? null} />
          ) : (
            <div className="mx-auto max-w-3xl space-y-8">
              {turns.map((t) => (
                <AnswerCard
                  key={t.id}
                  question={t.question}
                  answer={t.answer}
                  onEmail={() => openEmailForTurn(t)}
                  onCitationClick={onCitationClick}
                  onFlag={async () => {
                    try {
                      await fnCreateFlag({
                        data: {
                          question: t.question,
                          summary: t.answer.summary,
                          bullets: t.answer.bullets,
                          citations: t.answer.citations.map((c) => ({
                            id: c.id, type: c.type, issuer: c.issuer, title: c.title,
                            section: c.section, date: c.date, relevance: c.relevance, excerpt: c.excerpt,
                          })),
                          confidence: t.answer.confidence,
                        },
                      });
                      toast.success("Flagged — view in Tasks & Flags");
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Flag failed");
                    }
                  }}
                  onCreateTask={async () => {
                    try {
                      await fnCreateTask({
                        data: {
                          title: `Follow-up: ${t.question.slice(0, 100)}`,
                          description: t.answer.bullets.map((b) => `• ${b}`).join("\n"),
                          source_question: t.question,
                          source_answer: t.answer.summary,
                        },
                      });
                      toast.success("Task created", {
                        action: { label: "View tasks", onClick: () => navigate({ to: "/app/tasks" }) },
                      });
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Task create failed");
                    }
                  }}
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
        title={emailContent.title}
        defaultSubject={emailContent.subject}
        defaultBody={emailContent.body}
      />
      <ShareChatDialog chatId={chatId ?? null} open={shareOpen} onOpenChange={setShareOpen} />
    </AppLayout>

  );
}

function EmptyState({ onPick, newInProject }: { onPick: (q: string) => void; newInProject: string | null }) {
  const { projects } = useProjectsChats();
  const proj = newInProject ? projects.find((p) => p.id === newInProject) : null;
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
        {proj && (
          <p className="mt-2 inline-block rounded-full bg-gradient-brand-soft px-3 py-1 text-xs font-medium text-[color:var(--brand-indigo)]">
            New chat in project · {proj.name}
          </p>
        )}
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
