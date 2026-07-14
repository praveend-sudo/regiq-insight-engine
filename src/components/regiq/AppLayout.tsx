import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  MessageSquareText,
  Database,
  Bell,
  BarChart3,
  Settings,
  LogOut,
  Search,
  Mail,
  Download,
  Plus,
  PanelRightOpen,
  PanelRightClose,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderPlus,
  MessageSquare,
  Trash2,
  Pencil,
  MessageSquarePlus,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RegIQLogo } from "@/components/regiq/Logo";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ProjectsChatsProvider,
  useProjectsChats,
} from "@/hooks/use-projects-chats";
import type { ChatRow, ProjectRow } from "@/lib/chats.functions";

const NAV = [
  { to: "/app/chat", label: "Ask Compliance", icon: MessageSquareText, badge: null, group: "chat" as const },
  { to: "/app/tasks", label: "Tasks & Flags", icon: CheckSquare, badge: null, group: null },
  { to: "/app/sources", label: "Data Sources", icon: Database, badge: null, group: null },
  { to: "/app/notifications", label: "Notifications", icon: Bell, badge: "live" as const, group: null },
  { to: "/app/insights", label: "Insights", icon: BarChart3, badge: null, group: null },
  { to: "/app/settings", label: "Settings", icon: Settings, badge: null, group: "settings" as const },
];

const TITLES: Record<string, string> = {
  "/app/chat": "Ask Compliance",
  "/app/tasks": "Tasks & Flags",
  "/app/sources": "Data Sources",
  "/app/notifications": "Notifications",
  "/app/insights": "Insights",
  "/app/settings": "Settings",
};

export function AppLayout(props: {
  children: ReactNode;
  onEmailSummary?: () => void;
  onDownloadPdf?: () => void;
  onNewChat?: () => void;
  onToggleRefs?: () => void;
  refsOpen?: boolean;
  unreadCount?: number;
}) {
  return (
    <ProjectsChatsProvider>
      <AppLayoutInner {...props} />
    </ProjectsChatsProvider>
  );
}

function AppLayoutInner({
  children,
  onEmailSummary,
  onDownloadPdf,
  onNewChat,
  onToggleRefs,
  refsOpen,
  unreadCount = 0,
}: {
  children: ReactNode;
  onEmailSummary?: () => void;
  onDownloadPdf?: () => void;
  onNewChat?: () => void;
  onToggleRefs?: () => void;
  refsOpen?: boolean;
  unreadCount?: number;
}) {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const search = useRouterState({ select: (r) => r.location.search }) as { chatId?: string };
  const activeChatId = search?.chatId ?? null;
  const navigate = useNavigate();
  const title = TITLES[pathname] ?? "RegIQ";

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth" });
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r bg-sidebar">
        <div className="bg-gradient-brand p-5">
          <div className="flex items-center gap-2">
            <RegIQLogo onDark size="lg" />
            <span className="text-2xl leading-none" aria-label="Sri Lanka" title="Sri Lanka">🇱🇰</span>
          </div>
          <p className="mt-1 text-xs font-medium text-white/70">
            AI Compliance Assistant
          </p>
        </div>
        <nav className="flex-1 overflow-y-auto space-y-1 p-3">
          {NAV.map((item) => {
            const active = pathname === item.to;
            const Icon = item.icon;
            return (
              <div key={item.to}>
                <Link
                  to={item.to}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                    active
                      ? "bg-gradient-brand-soft text-[color:var(--brand-indigo)]"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  )}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-[color:var(--brand-cyan)]" />
                  )}
                  <Icon className="h-4 w-4" />
                  <span className="flex-1">{item.label}</span>
                  {item.badge === "live" && unreadCount > 0 && (
                    <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[color:var(--brand-cyan)] px-1.5 text-[10px] font-bold text-white animate-pulse-soft">
                      {unreadCount}
                    </span>
                  )}
                </Link>
                {item.group === "chat" && <ProjectsNav activeChatId={activeChatId} />}
                {item.group === "settings" && <ChatHistoryNav activeChatId={activeChatId} />}
              </div>
            );
          })}
        </nav>
        <div className="border-t p-3">
          <Button variant="ghost" size="sm" onClick={signOut} className="w-full justify-start gap-2">
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b bg-card/60 px-4 backdrop-blur">
          <h1 className="text-lg font-semibold">{title}</h1>
          <div className="relative ml-4 hidden max-w-md flex-1 md:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Search regulations, policies, decisions..."
              className="h-9 w-full rounded-lg border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-[color:var(--brand-violet)]/40"
            />
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            {onNewChat && (
              <Button variant="ghost" size="sm" onClick={onNewChat} className="gap-1.5">
                <Plus className="h-4 w-4" /> New chat
              </Button>
            )}
            {onEmailSummary && (
              <Button variant="ghost" size="sm" onClick={onEmailSummary} className="gap-1.5">
                <Mail className="h-4 w-4" /> Email
              </Button>
            )}
            {onDownloadPdf && (
              <Button variant="ghost" size="sm" onClick={onDownloadPdf} className="gap-1.5">
                <Download className="h-4 w-4" /> PDF
              </Button>
            )}
            {onToggleRefs && (
              <Button variant="outline" size="sm" onClick={onToggleRefs} className="gap-1.5">
                {refsOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
                References
              </Button>
            )}
          </div>
        </header>
        <main className="flex min-h-0 flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}

// ---------------- Projects nav (under Ask Compliance) ----------------
function ProjectsNav({ activeChatId }: { activeChatId: string | null }) {
  const { projects, chats, createProject, deleteProject } = useProjectsChats();
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const chatsIn = (pid: string) => chats.filter((c) => c.project_id === pid);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const p = await createProject(newName.trim());
    setNewName("");
    setDialogOpen(false);
    if (p) setExpanded((e) => ({ ...e, [p.id]: true }));
  };

  return (
    <div className="ml-2 mt-1">
      <div className="flex items-center gap-1 px-1.5">
        <button
          className="flex flex-1 items-center gap-1 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          <span>Projects</span>
        </button>
        <button
          className="p-0.5 text-muted-foreground hover:text-[color:var(--brand-indigo)]"
          onClick={() => setDialogOpen(true)}
          title="New project"
        >
          <FolderPlus className="h-3.5 w-3.5" />
        </button>
      </div>
      {open && (
        <div className="mt-1 space-y-0.5">
          {projects.length === 0 && (
            <p className="px-3 py-1 text-[11px] text-muted-foreground/70">No projects yet</p>
          )}
          {projects.map((p) => {
            const isExp = expanded[p.id] ?? false;
            const list = chatsIn(p.id);
            return (
              <div key={p.id}>
                <div className="group flex items-center gap-1 rounded-md px-2 py-1 text-xs text-foreground/70 hover:bg-muted">
                  <button
                    className="flex flex-1 items-center gap-1 truncate"
                    onClick={() => setExpanded((e) => ({ ...e, [p.id]: !isExp }))}
                  >
                    {isExp ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    <Folder className="h-3 w-3" />
                    <span className="truncate">{p.name}</span>
                    <span className="ml-1 text-[10px] text-muted-foreground">{list.length}</span>
                  </button>
                  <button
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-[color:var(--brand-indigo)]"
                    onClick={() => navigate({ to: "/app/chat", search: { newIn: p.id } })}
                    title="New chat in project"
                  >
                    <MessageSquarePlus className="h-3 w-3" />
                  </button>
                  <button
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-destructive"
                    onClick={() => {
                      if (confirm(`Delete project "${p.name}"? Its chats move to Unfiled.`)) {
                        void deleteProject(p.id);
                      }
                    }}
                    title="Delete project"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
                {isExp && (
                  <div className="ml-4 space-y-0.5">
                    {list.length === 0 && (
                      <p className="px-2 py-0.5 text-[11px] text-muted-foreground/60">Empty</p>
                    )}
                    {list.map((c) => (
                      <ChatItem key={c.id} chat={c} active={activeChatId === c.id} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New project</DialogTitle></DialogHeader>
          <Input
            placeholder="Project name (e.g. AML Review Q3)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------- Chat history nav (under Settings) ----------------
function ChatHistoryNav({ activeChatId }: { activeChatId: string | null }) {
  const { chats } = useProjectsChats();
  const [open, setOpen] = useState(false);
  // Only show unfiled chats + recent — recent = last 20 across all
  const recent = [...chats]
    .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))
    .slice(0, 20);

  return (
    <div className="ml-2 mt-1">
      <button
        className="flex w-full items-center gap-1 px-1.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <span>Chat history</span>
        <span className="ml-auto text-[10px] normal-case tracking-normal text-muted-foreground/70">
          {chats.length}
        </span>
      </button>
      {open && (
        <div className="mt-1 space-y-0.5">
          {recent.length === 0 && (
            <p className="px-3 py-1 text-[11px] text-muted-foreground/70">No chats yet</p>
          )}
          {recent.map((c) => (
            <ChatItem key={c.id} chat={c} active={activeChatId === c.id} showProject />
          ))}
        </div>
      )}
    </div>
  );
}

function ChatItem({ chat, active, showProject }: { chat: ChatRow; active: boolean; showProject?: boolean }) {
  const { deleteChat, renameChat, projects } = useProjectsChats();
  const navigate = useNavigate();
  const [renaming, setRenaming] = useState(false);
  const [value, setValue] = useState(chat.title);
  const proj = showProject && chat.project_id
    ? projects.find((p: ProjectRow) => p.id === chat.project_id)
    : null;

  const submit = async () => {
    if (!value.trim() || value === chat.title) {
      setRenaming(false);
      return;
    }
    await renameChat(chat.id, value.trim());
    setRenaming(false);
  };

  return (
    <div
      className={cn(
        "group flex items-center gap-1 rounded-md px-2 py-1 text-xs cursor-pointer",
        active
          ? "bg-gradient-brand-soft text-[color:var(--brand-indigo)] font-medium"
          : "text-foreground/70 hover:bg-muted",
      )}
      onClick={() => !renaming && navigate({ to: "/app/chat", search: { chatId: chat.id } })}
    >
      <MessageSquare className="h-3 w-3 shrink-0" />
      {renaming ? (
        <input
          className="flex-1 rounded border bg-background px-1 text-xs outline-none"
          value={value}
          autoFocus
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => setValue(e.target.value)}
          onBlur={submit}
          onKeyDown={(e) => {
            if (e.key === "Enter") void submit();
            if (e.key === "Escape") { setValue(chat.title); setRenaming(false); }
          }}
        />
      ) : (
        <span className="flex-1 truncate">
          {chat.title}
          {proj && <span className="ml-1 text-[10px] text-muted-foreground">· {proj.name}</span>}
        </span>
      )}
      {!renaming && (
        <>
          <button
            className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-foreground"
            onClick={(e) => { e.stopPropagation(); setRenaming(true); }}
            title="Rename"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Delete "${chat.title}"?`)) void deleteChat(chat.id);
            }}
            title="Delete"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </>
      )}
    </div>
  );
}
