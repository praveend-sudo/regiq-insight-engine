import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  ChevronDown,
  ChevronRight,
  FolderPlus,
  MessageSquarePlus,
  Trash2,
  Folder,
  MessageSquare,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  listProjects,
  listChats,
  createProject,
  createChat,
  deleteProject,
  deleteChat,
  renameChat,
  type ProjectRow,
  type ChatRow,
} from "@/lib/chats.functions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type ChatSidebarHandle = {
  refresh: () => Promise<void>;
};

export function ChatSidebar({
  activeChatId,
  onSelectChat,
  onCreateChat,
  refreshKey,
}: {
  activeChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onCreateChat: (projectId: string | null) => void;
  refreshKey?: number;
}) {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [chats, setChats] = useState<ChatRow[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ __none: true });
  const [projDialogOpen, setProjDialogOpen] = useState(false);
  const [newProjName, setNewProjName] = useState("");
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const fnListProjects = useServerFn(listProjects);
  const fnListChats = useServerFn(listChats);
  const fnCreateProject = useServerFn(createProject);
  const fnDeleteProject = useServerFn(deleteProject);
  const fnDeleteChat = useServerFn(deleteChat);
  const fnRenameChat = useServerFn(renameChat);

  const load = async () => {
    try {
      const [p, c] = await Promise.all([fnListProjects(), fnListChats()]);
      setProjects(p);
      setChats(c);
      // Expand all projects by default
      const exp: Record<string, boolean> = { __none: true };
      for (const proj of p) exp[proj.id] = expanded[proj.id] ?? true;
      setExpanded(exp);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load projects");
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const chatsByProject = (pid: string | null) =>
    chats.filter((c) => (c.project_id ?? null) === pid);

  const handleCreateProject = async () => {
    if (!newProjName.trim()) return;
    try {
      const p = await fnCreateProject({ data: { name: newProjName.trim() } });
      setNewProjName("");
      setProjDialogOpen(false);
      setProjects((prev) => [...prev, p]);
      setExpanded((e) => ({ ...e, [p.id]: true }));
      toast.success("Project created");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Create failed");
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm("Delete this project? Chats inside will be moved to Unfiled.")) return;
    try {
      await fnDeleteProject({ data: { id } });
      setProjects((prev) => prev.filter((p) => p.id !== id));
      setChats((prev) => prev.map((c) => (c.project_id === id ? { ...c, project_id: null } : c)));
      toast.success("Project deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const handleDeleteChat = async (id: string) => {
    if (!confirm("Delete this chat and its history?")) return;
    try {
      await fnDeleteChat({ data: { id } });
      setChats((prev) => prev.filter((c) => c.id !== id));
      toast.success("Chat deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const handleRenameChat = async () => {
    if (!renameId || !renameValue.trim()) return;
    try {
      const updated = await fnRenameChat({ data: { id: renameId, title: renameValue.trim() } });
      setChats((prev) => prev.map((c) => (c.id === renameId ? updated : c)));
      setRenameId(null);
      setRenameValue("");
      toast.success("Renamed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Rename failed");
    }
  };

  const toggle = (id: string) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  const renderChat = (c: ChatRow) => (
    <div
      key={c.id}
      className={cn(
        "group flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm cursor-pointer",
        activeChatId === c.id
          ? "bg-gradient-brand-soft text-[color:var(--brand-indigo)] font-medium"
          : "text-foreground/70 hover:bg-muted",
      )}
      onClick={() => onSelectChat(c.id)}
    >
      <MessageSquare className="h-3.5 w-3.5 shrink-0" />
      <span className="flex-1 truncate">{c.title}</span>
      <button
        className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-foreground"
        onClick={(e) => {
          e.stopPropagation();
          setRenameId(c.id);
          setRenameValue(c.title);
        }}
        title="Rename"
      >
        <Pencil className="h-3 w-3" />
      </button>
      <button
        className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-destructive"
        onClick={(e) => {
          e.stopPropagation();
          void handleDeleteChat(c.id);
        }}
        title="Delete"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r bg-card/40">
      <div className="flex items-center justify-between border-b p-3">
        <span className="text-sm font-semibold">Projects & Chats</span>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setProjDialogOpen(true)}
            title="New project"
          >
            <FolderPlus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onCreateChat(null)}
            title="New chat"
          >
            <MessageSquarePlus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {/* Unfiled */}
        <div>
          <button
            className="flex w-full items-center gap-1 rounded-md px-1.5 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
            onClick={() => toggle("__none")}
          >
            {expanded.__none ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            <span>Unfiled</span>
          </button>
          {expanded.__none && (
            <div className="ml-2 mt-1 space-y-0.5">
              {chatsByProject(null).map(renderChat)}
              {chatsByProject(null).length === 0 && (
                <p className="px-2 py-1 text-xs text-muted-foreground/70">No chats</p>
              )}
            </div>
          )}
        </div>

        {/* Projects */}
        {projects.map((p) => (
          <div key={p.id}>
            <div className="group flex items-center gap-1 rounded-md px-1.5 py-1">
              <button
                className="flex flex-1 items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
                onClick={() => toggle(p.id)}
              >
                {expanded[p.id] ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                <Folder className="h-3 w-3" />
                <span className="truncate">{p.name}</span>
              </button>
              <button
                className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-[color:var(--brand-indigo)]"
                onClick={() => onCreateChat(p.id)}
                title="New chat in project"
              >
                <MessageSquarePlus className="h-3 w-3" />
              </button>
              <button
                className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-destructive"
                onClick={() => void handleDeleteProject(p.id)}
                title="Delete project"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
            {expanded[p.id] && (
              <div className="ml-2 mt-1 space-y-0.5">
                {chatsByProject(p.id).map(renderChat)}
                {chatsByProject(p.id).length === 0 && (
                  <p className="px-2 py-1 text-xs text-muted-foreground/70">No chats</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* New project dialog */}
      <Dialog open={projDialogOpen} onOpenChange={setProjDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New project</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Project name (e.g. AML Review Q3)"
            value={newProjName}
            onChange={(e) => setNewProjName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateProject()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setProjDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateProject} disabled={!newProjName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename chat dialog */}
      <Dialog open={!!renameId} onOpenChange={(o) => !o && setRenameId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename chat</DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRenameChat()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameId(null)}>Cancel</Button>
            <Button onClick={handleRenameChat}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
