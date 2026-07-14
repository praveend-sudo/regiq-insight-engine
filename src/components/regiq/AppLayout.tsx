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
} from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { RegIQLogo } from "@/components/regiq/Logo";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const NAV = [
  { to: "/app/chat", label: "Ask Compliance", icon: MessageSquareText, badge: null },
  { to: "/app/tasks", label: "Tasks & Flags", icon: CheckSquare, badge: null },
  { to: "/app/sources", label: "Data Sources", icon: Database, badge: null },
  { to: "/app/notifications", label: "Notifications", icon: Bell, badge: "live" as const },
  { to: "/app/insights", label: "Insights", icon: BarChart3, badge: null },
  { to: "/app/settings", label: "Settings", icon: Settings, badge: null },
];

const TITLES: Record<string, string> = {
  "/app/chat": "Ask Compliance",
  "/app/tasks": "Tasks & Flags",
  "/app/sources": "Data Sources",
  "/app/notifications": "Notifications",
  "/app/insights": "Insights",
  "/app/settings": "Settings",
};


export function AppLayout({
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
          <RegIQLogo onDark size="lg" />
          <p className="mt-1 text-xs font-medium text-white/70">
            AI Compliance Assistant
          </p>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map((item) => {
            const active = pathname === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
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
        {/* Top bar */}
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
