import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RegIQLogo } from "@/components/regiq/Logo";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { next?: string } => ({
    next: typeof s.next === "string" ? s.next : undefined,
  }),
  component: AuthPage,
});

// Only allow same-origin relative paths as a post-login destination.
function safeNext(next?: string) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

function AuthPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const target = safeNext(next);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  const goAfterAuth = () => {
    if (target) {
      window.location.href = target;
      return;
    }
    navigate({ to: "/app/chat" });
  };

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (!data.session) return;
      if (target) window.location.href = target;
      else navigate({ to: "/app/chat" });
    });
  }, [navigate, target]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${target ?? ""}`,
            data: { full_name: fullName || email },
          },
        });
        if (error) throw error;
        toast.success("Account created. Signing you in...");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      goAfterAuth();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    setLoading(true);
    const res = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}${target ?? ""}`,
    });
    if (res.error) {
      toast.error(res.error.message ?? "Google sign in failed");
      setLoading(false);
      return;
    }
    if (!res.redirected) {
      goAfterAuth();
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-brand" />
      <div className="absolute -top-20 -left-20 h-96 w-96 rounded-full bg-[color:var(--brand-cyan)]/40 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-[color:var(--brand-violet)]/50 blur-3xl" />

      <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
        <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-2">
          {/* Left pane — pitch */}
          <div className="hidden lg:flex flex-col justify-center gap-6 text-white">
            <RegIQLogo onDark size="lg" />
            <h1 className="text-4xl font-black leading-tight">
              Regulatory intelligence <br />for Sri Lankan financial institutions.
            </h1>
            <p className="text-white/80 text-lg max-w-md">
              Ask one question — RegIQ synthesizes across CBSL, SEC, CSE, IRD circulars
              and your internal policies, and tells you exactly where you're out of compliance.
            </p>
            <ul className="space-y-3 text-white/90 text-sm">
              <li className="flex gap-2"><ShieldCheck className="h-5 w-5 text-[color:var(--brand-cyan)]" /> Cited, multi-source AI answers</li>
              <li className="flex gap-2"><ShieldCheck className="h-5 w-5 text-[color:var(--brand-cyan)]" /> Automatic gap detection between regulations and your policies</li>
              <li className="flex gap-2"><ShieldCheck className="h-5 w-5 text-[color:var(--brand-cyan)]" /> Real-time notifications when CBSL/SEC/CSE/IRD publishes</li>
            </ul>
          </div>

          {/* Right pane — form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-card p-8 shadow-glow"
          >
            <div className="mb-6 flex flex-col items-center gap-2 lg:hidden">
              <RegIQLogo size="lg" />
              <p className="text-sm text-muted-foreground">AI Compliance Assistant</p>
            </div>

            <h2 className="text-2xl font-bold">
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "signin"
                ? "Sign in to access your compliance workspace."
                : "Start asking questions across regulatory & internal documents."}
            </p>

            <Button
              variant="outline"
              size="lg"
              className="mt-6 w-full gap-2"
              onClick={google}
              disabled={loading}
            >
              <GoogleIcon /> Continue with Google
            </Button>
            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs uppercase text-muted-foreground">or</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              {mode === "signup" && (
                <div>
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nimasha Perera" />
                </div>
              )}
              <div>
                <Label htmlFor="email">Work email</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@bank.lk" />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
              </div>
              <Button type="submit" size="lg" disabled={loading} className="w-full bg-gradient-brand text-white shadow-card hover:opacity-90">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === "signin" ? "Sign in" : "Create account"}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              {mode === "signin" ? "New to RegIQ?" : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                className="font-semibold text-[color:var(--brand-indigo)] hover:underline"
              >
                {mode === "signin" ? "Create an account" : "Sign in"}
              </button>
            </p>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              <Link to="/">← Back home</Link>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.66 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.4 14.7 2.5 12 2.5 6.7 2.5 2.5 6.7 2.5 12S6.7 21.5 12 21.5c6.9 0 9.5-4.8 9.5-9.4 0-.6-.1-1.1-.2-1.9H12z" />
    </svg>
  );
}
