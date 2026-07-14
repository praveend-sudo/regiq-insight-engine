import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  listProjects,
  listChats,
  createProject as fnCreateProject,
  deleteProject as fnDeleteProject,
  createChat as fnCreateChat,
  deleteChat as fnDeleteChat,
  renameChat as fnRenameChat,
  type ProjectRow,
  type ChatRow,
} from "@/lib/chats.functions";
import { toast } from "sonner";

type Ctx = {
  projects: ProjectRow[];
  chats: ChatRow[];
  loading: boolean;
  refresh: () => Promise<void>;
  createProject: (name: string) => Promise<ProjectRow | null>;
  deleteProject: (id: string) => Promise<void>;
  createChat: (title: string, projectId: string | null) => Promise<ChatRow | null>;
  deleteChat: (id: string) => Promise<void>;
  renameChat: (id: string, title: string) => Promise<void>;
};

const ProjectsChatsContext = createContext<Ctx | null>(null);

export function ProjectsChatsProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [chats, setChats] = useState<ChatRow[]>([]);
  const [loading, setLoading] = useState(true);

  const lp = useServerFn(listProjects);
  const lc = useServerFn(listChats);
  const cp = useServerFn(fnCreateProject);
  const dp = useServerFn(fnDeleteProject);
  const cc = useServerFn(fnCreateChat);
  const dc = useServerFn(fnDeleteChat);
  const rc = useServerFn(fnRenameChat);

  const refresh = useCallback(async () => {
    try {
      const [p, c] = await Promise.all([lp(), lc()]);
      setProjects(p);
      setChats(c);
    } catch (e) {
      // silent — surfaces on individual actions
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [lp, lc]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value: Ctx = {
    projects,
    chats,
    loading,
    refresh,
    async createProject(name) {
      try {
        const p = await cp({ data: { name } });
        setProjects((prev) => [...prev, p]);
        toast.success("Project created");
        return p;
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Create failed");
        return null;
      }
    },
    async deleteProject(id) {
      try {
        await dp({ data: { id } });
        setProjects((prev) => prev.filter((p) => p.id !== id));
        setChats((prev) => prev.map((c) => (c.project_id === id ? { ...c, project_id: null } : c)));
        toast.success("Project deleted");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Delete failed");
      }
    },
    async createChat(title, projectId) {
      try {
        const c = await cc({ data: { title, project_id: projectId } });
        setChats((prev) => [c, ...prev]);
        return c;
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Create failed");
        return null;
      }
    },
    async deleteChat(id) {
      try {
        await dc({ data: { id } });
        setChats((prev) => prev.filter((c) => c.id !== id));
        toast.success("Chat deleted");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Delete failed");
      }
    },
    async renameChat(id, title) {
      try {
        const row = await rc({ data: { id, title } });
        setChats((prev) => prev.map((c) => (c.id === id ? row : c)));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Rename failed");
      }
    },
  };

  return <ProjectsChatsContext.Provider value={value}>{children}</ProjectsChatsContext.Provider>;
}

export function useProjectsChats() {
  const ctx = useContext(ProjectsChatsContext);
  if (!ctx) throw new Error("useProjectsChats must be used inside ProjectsChatsProvider");
  return ctx;
}
