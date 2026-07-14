import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/regiq/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User, Building, Globe, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [org, setOrg] = useState("");
  const [role, setRole] = useState<"compliance_officer" | "executive">("compliance_officer");
  const [lang, setLang] = useState("en");

  useEffect(() => {
    void (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      if (userRes.user) {
        setEmail(userRes.user.email ?? "");
        const { data } = await supabase.from("profiles").select("*").eq("id", userRes.user.id).maybeSingle();
        if (data) {
          setFullName(data.full_name ?? "");
          setOrg(data.organization ?? "");
          setRole((data.role as "compliance_officer" | "executive") ?? "compliance_officer");
        }
      }
    })();
  }, []);

  const save = async () => {
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) return;
    const { error } = await supabase.from("profiles").upsert({
      id: userRes.user.id,
      full_name: fullName,
      organization: org,
      role,
    });
    if (error) toast.error(error.message);
    else toast.success("Profile saved");
  };

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-3xl overflow-y-auto px-4 py-8 md:px-8">
        <Card icon={<User className="h-4 w-4" />} title="Profile">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email"><Input value={email} disabled /></Field>
            <Field label="Full name"><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></Field>
            <Field label="Organization"><Input value={org} onChange={(e) => setOrg(e.target.value)} placeholder="e.g. Sampath Bank PLC" /></Field>
          </div>
        </Card>

        <Card icon={<ShieldCheck className="h-4 w-4" />} title="Role & workspace view">
          <div className="grid gap-2 sm:grid-cols-2">
            <RoleBtn active={role === "compliance_officer"} onClick={() => setRole("compliance_officer")} title="Compliance Officer" desc="Deep view: gaps, citations, all evidence." />
            <RoleBtn active={role === "executive"} onClick={() => setRole("executive")} title="Executive" desc="Summary view: scores, deadlines, top risks." />
          </div>
        </Card>

        <Card icon={<Globe className="h-4 w-4" />} title="Language">
          <div className="flex gap-2">
            {[{ id: "en", label: "English" }, { id: "si", label: "සිංහල" }, { id: "ta", label: "தமிழ்" }].map((l) => (
              <button
                key={l.id}
                onClick={() => setLang(l.id)}
                className={`rounded-lg border px-4 py-2 text-sm ${lang === l.id ? "border-[color:var(--brand-violet)] bg-gradient-brand-soft text-[color:var(--brand-indigo)] font-semibold" : "hover:bg-muted"}`}
              >
                {l.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Multi-language support coming soon (placeholder).</p>
        </Card>

        <Card icon={<Building className="h-4 w-4" />} title="Audit trail">
          <p className="text-sm text-muted-foreground">Every question, answer, confidence score, and citation is logged for regulator inspection. Export the full log from the compliance ops panel.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => toast("Audit export queued")}>Export audit log (CSV)</Button>
        </Card>

        <div className="mt-6 flex justify-end">
          <Button className="bg-gradient-brand text-white" onClick={save}>Save changes</Button>
        </div>
      </div>
    </AppLayout>
  );
}

function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 rounded-2xl border bg-card p-5 shadow-card">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {icon} {title}
      </h3>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 block">{label}</Label>
      {children}
    </div>
  );
}

function RoleBtn({ active, onClick, title, desc }: { active: boolean; onClick: () => void; title: string; desc: string }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border p-4 text-left transition-all ${
        active
          ? "border-[color:var(--brand-violet)] bg-gradient-brand-soft"
          : "hover:border-[color:var(--brand-violet)]/40"
      }`}
    >
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
    </button>
  );
}
