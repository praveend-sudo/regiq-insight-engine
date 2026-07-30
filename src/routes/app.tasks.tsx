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
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  listTasks,
  createTask,
  updateTask,
  deleteTask,
  assignTask,
  listFlagged,
  deleteFlagged,
  type TaskRow,
  type FlaggedRow,
} from "@/lib/tasks.functions";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDays, CheckSquare, Flag, Mail, Pencil, Plus, Trash2, UserPlus, X } from "lucide-react";
import { EVENT_STYLE, toISODate } from "@/lib/schedule";
import { cn } from "@/lib/utils";
import { EmailSummaryDialog } from "@/components/regiq/EmailSummaryDialog";

export const Route = createFileRoute("/app/tasks")({
  component: TasksPage,
});

const STATUS_META: Record<TaskRow["status"], { label: string; cls: string }> = {
  open: { label: "Open", cls: "bg-[color:var(--brand-blue)]/10 text-[color:var(--brand-blue)] border-[color:var(--brand-blue)]/30" },
  in_progress: { label: "In progress", cls: "bg-[color:var(--warning)]/10 text-[color:var(--warning)] border-[color:var(--warning)]/30" },
  done: { label: "Done", cls: "bg-[color:var(--success)]/10 text-[color:var(--success)] border-[color:var(--success)]/30" },
};

function TasksPage() {
  const [tab, setTab] = useState<"tasks" | "flags">("tasks");
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [flags, setFlags] = useState<FlaggedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [editTask, setEditTask] = useState<TaskRow | null>(null);
  const [emailTask, setEmailTask] = useState<TaskRow | null>(null);
  const [assignTaskRow, setAssignTaskRow] = useState<TaskRow | null>(null);

  const fnList = useServerFn(listTasks);
  const fnCreate = useServerFn(createTask);
  const fnUpdate = useServerFn(updateTask);
  const fnDelete = useServerFn(deleteTask);
  const fnAssign = useServerFn(assignTask);
  const fnFlags = useServerFn(listFlagged);
  const fnDelFlag = useServerFn(deleteFlagged);

  const load = async () => {
    setLoading(true);
    try {
      const [t, f] = await Promise.all([fnList(), fnFlags()]);
      setTasks(t as TaskRow[]);
      setFlags(f as FlaggedRow[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    return {
      open: tasks.filter((t) => t.status === "open").length,
      inp: tasks.filter((t) => t.status === "in_progress").length,
      done: tasks.filter((t) => t.status === "done").length,
    };
  }, [tasks]);

  const onStatus = async (row: TaskRow, status: TaskRow["status"]) => {
    setTasks((prev) => prev.map((t) => (t.id === row.id ? { ...t, status } : t)));
    try {
      await fnUpdate({ data: { id: row.id, status } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
      void load();
    }
  };

  const onRemarks = async (row: TaskRow, remarks: string) => {
    setTasks((prev) => prev.map((t) => (t.id === row.id ? { ...t, remarks } : t)));
    try {
      await fnUpdate({ data: { id: row.id, remarks } });
      toast.success("Remarks saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  const onDelete = async (row: TaskRow) => {
    if (!confirm("Delete this task?")) return;
    setTasks((prev) => prev.filter((t) => t.id !== row.id));
    try {
      await fnDelete({ data: { id: row.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
      void load();
    }
  };

  const onCreate = async (title: string, description: string, dueDate: string) => {
    try {
      const row = await fnCreate({
        data: { title, description: description || undefined, due_date: dueDate || null },
      });
      setTasks((p) => [row as TaskRow, ...p]);
      setShowNew(false);
      toast.success("Task created");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Create failed");
    }
  };

  const onEditSave = async (id: string, title: string, description: string, dueDate: string) => {
    try {
      const updated = await fnUpdate({
        data: { id, title, description: description || null, due_date: dueDate || null },
      });
      setTasks((p) => p.map((t) => (t.id === id ? { ...t, ...(updated as TaskRow) } : t)));
      setEditTask(null);
      toast.success("Task updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };


  const onAssign = async (row: TaskRow, email: string | null) => {
    try {
      const updated = await fnAssign({ data: { id: row.id, email } });
      setTasks((p) => p.map((t) => (t.id === row.id ? { ...t, ...(updated as TaskRow) } : t)));
      setAssignTaskRow(null);
      toast.success(email ? `Assigned to ${email}` : "Unassigned");
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Assign failed");
    }
  };

  const onDeleteFlag = async (id: string) => {
    setFlags((p) => p.filter((f) => f.id !== id));
    try {
      await fnDelFlag({ data: { id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-5xl overflow-y-auto px-4 py-8 md:px-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-brand text-white shadow-glow">
              <CheckSquare className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Tasks & Flagged Answers</h2>
              <p className="text-sm text-muted-foreground">
                Track compliance follow-ups, add remarks, and assign to teammates.
              </p>
            </div>
          </div>
          {tab === "tasks" && (
            <Button onClick={() => setShowNew(true)} className="gap-1.5 bg-gradient-brand text-white">
              <Plus className="h-4 w-4" /> New task
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-4 flex gap-1 rounded-xl border bg-card p-1 w-fit">
          <TabBtn active={tab === "tasks"} onClick={() => setTab("tasks")}>
            <CheckSquare className="h-3.5 w-3.5" /> Tasks ({tasks.length})
          </TabBtn>
          <TabBtn active={tab === "flags"} onClick={() => setTab("flags")}>
            <Flag className="h-3.5 w-3.5" /> Flagged ({flags.length})
          </TabBtn>
        </div>

        {tab === "tasks" && (
          <>
            <div className="mb-4 grid grid-cols-3 gap-3">
              <Kpi label="Open" value={stats.open} tone="blue" />
              <Kpi label="In progress" value={stats.inp} tone="amber" />
              <Kpi label="Done" value={stats.done} tone="green" />
            </div>

            {loading ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : tasks.length === 0 ? (
              <EmptyBlock
                icon={<CheckSquare className="h-6 w-6" />}
                title="No tasks yet"
                hint="Create one directly or use 'Create task' on any AI answer."
              />
            ) : (
              <div className="space-y-3">
                <AnimatePresence initial={false}>
                  {tasks.map((t) => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      isOwner={t.user_id === me}
                      onStatus={(s) => onStatus(t, s)}
                      onRemarks={(r) => onRemarks(t, r)}
                      onDelete={() => onDelete(t)}
                      onAssign={() => setAssignTaskRow(t)}
                      onEdit={() => setEditTask(t)}
                      onEmail={() => setEmailTask(t)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </>
        )}

        {tab === "flags" && (
          <>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : flags.length === 0 ? (
              <EmptyBlock
                icon={<Flag className="h-6 w-6" />}
                title="No flagged answers"
                hint="Use the Flag button on any AI answer to save it here for review."
              />
            ) : (
              <div className="space-y-3">
                {flags.map((f) => (
                  <div key={f.id} className="rounded-2xl border bg-card p-5 shadow-card">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[color:var(--brand-violet)]">
                          <Flag className="h-3.5 w-3.5" /> Flagged
                          <span className="text-muted-foreground font-normal normal-case">
                            {new Date(f.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="mt-2 font-semibold">{f.question}</p>
                        <p className="mt-2 text-sm text-foreground/80">{f.summary}</p>
                        {f.bullets?.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {f.bullets.map((b, i) => (
                              <li key={i} className="flex gap-2 text-sm">
                                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--brand-cyan)]" />
                                {b}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => onDeleteFlag(f.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <NewTaskDialog open={showNew} onOpenChange={setShowNew} onSubmit={onCreate} />
      <EditTaskDialog
        task={editTask}
        onClose={() => setEditTask(null)}
        onSave={onEditSave}
      />
      <AssignDialog
        task={assignTaskRow}
        onClose={() => setAssignTaskRow(null)}
        onAssign={onAssign}
      />
      <EmailSummaryDialog
        open={!!emailTask}
        onOpenChange={(v) => { if (!v) setEmailTask(null); }}
        title="Email task"
        defaultSubject={emailTask ? `RegIQ Task: ${emailTask.title}` : ""}
        defaultBody={emailTask ? formatTaskEmail(emailTask) : ""}
      />
    </AppLayout>
  );
}

function formatTaskEmail(t: TaskRow): string {
  const lines = [
    `Task: ${t.title}`,
    `Status: ${STATUS_META[t.status].label}`,
    `Created: ${new Date(t.created_at).toLocaleDateString()}`,
    `By: ${t.creator_name ?? "—"}`,
    `Assigned to: ${t.assignee_name ?? (t.assigned_to ? "someone" : "unassigned")}`,
  ];
  if (t.description) lines.push(``, `Description:`, t.description);
  if (t.source_question) lines.push(``, `From answer to: ${t.source_question}`);
  if (t.remarks) lines.push(``, `Remarks:`, t.remarks);
  return lines.join("\n");
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
        active ? "bg-gradient-brand text-white shadow-card" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function Kpi({ label, value, tone }: { label: string; value: number; tone: "blue" | "amber" | "green" }) {
  const toneCls =
    tone === "blue"
      ? "text-[color:var(--brand-blue)]"
      : tone === "amber"
        ? "text-[color:var(--warning)]"
        : "text-[color:var(--success)]";
  return (
    <div className="rounded-xl border bg-card p-4 shadow-card">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-2xl font-bold", toneCls)}>{value}</p>
    </div>
  );
}

function EmptyBlock({ icon, title, hint }: { icon: React.ReactNode; title: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-dashed bg-card/50 p-10 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-gradient-brand-soft text-[color:var(--brand-indigo)]">
        {icon}
      </div>
      <p className="mt-3 font-semibold">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}

function TaskCard({
  task,
  isOwner,
  onStatus,
  onRemarks,
  onDelete,
  onAssign,
  onEdit,
  onEmail,
}: {
  task: TaskRow;
  isOwner: boolean;
  onStatus: (s: TaskRow["status"]) => void;
  onRemarks: (r: string) => void;
  onDelete: () => void;
  onAssign: () => void;
  onEdit: () => void;
  onEmail: () => void;
}) {
  const [remarks, setRemarks] = useState(task.remarks ?? "");
  const [dirty, setDirty] = useState(false);
  const meta = STATUS_META[task.status];
  const kind = isOwner && task.assigned_to ? "assigned_by_me" : "assigned_to_me";
  const overdue = !!task.due_date && task.status !== "done" && task.due_date < toISODate(new Date());

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="rounded-2xl border bg-card p-5 shadow-card"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{task.title}</h3>
            <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase", meta.cls)}>
              {meta.label}
            </span>
          </div>
          {task.description && (
            <p className="mt-1 text-sm text-foreground/80 whitespace-pre-wrap">{task.description}</p>
          )}
          {task.source_question && (
            <div className="mt-2 rounded-lg border-l-2 border-[color:var(--brand-violet)] bg-gradient-brand-soft/40 p-2 text-xs text-muted-foreground">
              <span className="font-semibold text-[color:var(--brand-indigo)]">From answer:</span>{" "}
              {task.source_question}
            </div>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>Created {new Date(task.created_at).toLocaleDateString()}</span>
            <span>·</span>
            <span>By {task.creator_name ?? "you"}</span>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              Assigned to{" "}
              <button
                onClick={onAssign}
                className="font-semibold text-[color:var(--brand-indigo)] underline-offset-2 hover:underline"
              >
                {task.assignee_name ?? (task.assigned_to ? "someone" : "unassigned")}
              </button>
            </span>
            {task.due_date && (
              <>
                <span>·</span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-semibold",
                    EVENT_STYLE[kind].chip,
                    overdue ? "text-[color:var(--risk)]" : EVENT_STYLE[kind].text,
                  )}
                >
                  <CalendarDays className="h-3 w-3" />
                  {overdue ? "Overdue " : "Target "}
                  {new Date(`${task.due_date}T00:00:00`).toLocaleDateString()}
                </span>
              </>
            )}
          </div>

        </div>
        <div className="flex items-center gap-1.5">
          <Select value={task.status} onValueChange={(v) => onStatus(v as TaskRow["status"])}>
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In progress</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
          {isOwner && (
            <Button variant="ghost" size="icon" onClick={onEdit} title="Edit">
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onEmail} title="Email task">
            <Mail className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onAssign} title="Assign">
            <UserPlus className="h-4 w-4" />
          </Button>
          {isOwner && (
            <Button variant="ghost" size="icon" onClick={onDelete} title="Delete">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="mt-4 border-t pt-3">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Remarks
        </label>
        <Textarea
          value={remarks}
          onChange={(e) => { setRemarks(e.target.value); setDirty(true); }}
          placeholder="Add notes, progress, blockers…"
          className="mt-1 min-h-[60px] text-sm"
        />
        {dirty && (
          <div className="mt-2 flex justify-end gap-1.5">
            <Button size="sm" variant="ghost" onClick={() => { setRemarks(task.remarks ?? ""); setDirty(false); }}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => { onRemarks(remarks); setDirty(false); }}>
              Save remarks
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function NewTaskDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (title: string, description: string, dueDate: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [due, setDue] = useState("");
  useEffect(() => { if (!open) { setTitle(""); setDesc(""); setDue(""); } }, [open]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
          <DialogDescription>Create a compliance follow-up task.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Update incident response SLA" />
          </div>
          <div>
            <label className="text-sm font-medium">Description</label>
            <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Optional details" />
          </div>
          <div>
            <label className="text-sm font-medium">Target completion date</label>
            <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => title.trim() && onSubmit(title.trim(), desc.trim(), due)}
            disabled={!title.trim()}
            className="bg-gradient-brand text-white"
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function AssignDialog({
  task,
  onClose,
  onAssign,
}: {
  task: TaskRow | null;
  onClose: () => void;
  onAssign: (task: TaskRow, email: string | null) => void;
}) {
  const [email, setEmail] = useState("");
  useEffect(() => { setEmail(""); }, [task?.id]);
  return (
    <Dialog open={!!task} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign task</DialogTitle>
          <DialogDescription>
            Enter a teammate's email. They must already have a RegIQ account.
          </DialogDescription>
        </DialogHeader>
        {task?.assignee_name && (
          <p className="text-sm text-muted-foreground">
            Currently assigned to <span className="font-semibold text-foreground">{task.assignee_name}</span>.
          </p>
        )}
        <div>
          <label className="text-sm font-medium">Email</label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teammate@bank.lk"
          />
        </div>
        <DialogFooter className="gap-2">
          {task?.assigned_to && (
            <Button variant="outline" onClick={() => task && onAssign(task, null)}>
              Unassign
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            className="bg-gradient-brand text-white"
            disabled={!email.trim()}
            onClick={() => task && onAssign(task, email.trim())}
          >
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditTaskDialog({
  task,
  onClose,
  onSave,
}: {
  task: TaskRow | null;
  onClose: () => void;
  onSave: (id: string, title: string, description: string, dueDate: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [due, setDue] = useState("");
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDesc(task.description ?? "");
      setDue(task.due_date ?? "");
    }
  }, [task]);
  return (
    <Dialog open={!!task} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit task</DialogTitle>
          <DialogDescription>Update the title, description or target date.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Description</label>
            <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={5} />
          </div>
          <div>
            <label className="text-sm font-medium">Target completion date</label>
            <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            className="bg-gradient-brand text-white"
            disabled={!title.trim()}
            onClick={() => task && onSave(task.id, title.trim(), desc.trim(), due)}
          >

            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
