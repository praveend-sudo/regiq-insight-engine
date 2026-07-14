import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/regiq/AppLayout";
import { DATA_SOURCES } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import {
  Building2,
  FileText,
  Plus,
  Upload,
  CheckCircle2,
  Loader2,
  Cloud,
} from "lucide-react";
import { IssuerBadge } from "@/components/regiq/ReferencesPanel";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/app/sources")({
  component: SourcesPage,
});

function SourcesPage() {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) throw new Error("Not signed in");

      for (const file of Array.from(files)) {
        const path = `${uid}/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage
          .from("regiq-documents")
          .upload(path, file);
        if (upErr) throw upErr;

        await supabase.from("uploaded_documents").insert({
          user_id: uid,
          name: file.name,
          source_type: "internal",
          issuer: "Internal",
          file_size: file.size,
          storage_path: path,
          status: "synced",
        });

        // simulate notification pipeline
        await supabase.from("notifications").insert({
          user_id: uid,
          title: `New internal document: ${file.name}`,
          summary: "RegIQ has ingested this document and cross-referenced it against 27 external regulations and 12 internal policies.",
          impact: "medium",
          issuer: "Internal",
          linked: ["IT Security Policy v4.2", "CBSL Direction 04/2021"],
          ai_insight: "This document references controls in 2 external regulations. No conflicts detected yet.",
        });
      }
      toast.success(`Uploaded ${files.length} document${files.length > 1 ? "s" : ""}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-6xl overflow-y-auto px-4 py-8 md:px-8">
        <Section title="External Regulators" icon={<Building2 className="h-4 w-4" />}>
          <div className="grid gap-4 md:grid-cols-2">
            {DATA_SOURCES.external.map((s) => (
              <SourceCard key={s.id} {...s} />
            ))}
          </div>
        </Section>

        <div className="mt-10">
          <Section title="Internal Repositories" icon={<FileText className="h-4 w-4" />}>
            <div className="grid gap-4 md:grid-cols-2">
              {DATA_SOURCES.internal.map((s) => (
                <SourceCard key={s.id} {...s} />
              ))}
              <motion.div
                whileHover={{ y: -2 }}
                className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center"
              >
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-brand text-white">
                  <Plus className="h-5 w-5" />
                </div>
                <p className="font-semibold">Add internal source</p>
                <p className="text-xs text-muted-foreground">SharePoint · Google Drive · S3</p>
                <Button variant="outline" size="sm" className="mt-1">Connect</Button>
              </motion.div>
            </div>
          </Section>
        </div>

        {/* Upload area */}
        <div className="mt-10">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Upload documents
          </h3>
          <label
            htmlFor="file-upload"
            onDragOver={(e) => { e.preventDefault(); }}
            onDrop={(e) => { e.preventDefault(); void upload(e.dataTransfer.files); }}
            className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed bg-card p-10 text-center transition-colors hover:border-[color:var(--brand-violet)] hover:bg-gradient-brand-soft"
          >
            {uploading ? (
              <Loader2 className="h-8 w-8 animate-spin text-[color:var(--brand-violet)]" />
            ) : (
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-brand text-white shadow-glow">
                <Upload className="h-6 w-6" />
              </div>
            )}
            <div>
              <p className="font-semibold">Drop files or click to upload</p>
              <p className="text-xs text-muted-foreground">
                PDF, DOCX up to 25 MB — new documents trigger a smart-notification pipeline
              </p>
            </div>
            <input
              ref={inputRef}
              id="file-upload"
              type="file"
              className="hidden"
              multiple
              accept=".pdf,.doc,.docx,.txt"
              onChange={(e) => void upload(e.target.files)}
            />
          </label>
        </div>
      </div>
    </AppLayout>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {title}
      </h2>
      {children}
    </div>
  );
}

function SourceCard({
  name,
  docs,
  updated,
  status,
  id,
}: {
  name: string;
  docs: number;
  updated: string;
  status: "synced" | "syncing";
  id: string;
}) {
  const issuer = id.toUpperCase();
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="rounded-2xl border bg-card p-5 shadow-card"
    >
      <div className="flex items-start gap-3">
        <IssuerBadge issuer={issuer.length > 4 ? "Internal" : issuer} />
        <div className="flex-1">
          <h3 className="font-semibold leading-tight">{name}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {docs.toLocaleString()} documents · updated {updated}
          </p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs">
          {status === "synced" ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 text-[color:var(--success)]" />
              <span className="text-[color:var(--success)] font-medium">Synced</span>
            </>
          ) : (
            <>
              <Cloud className="h-3.5 w-3.5 text-[color:var(--brand-cyan)] animate-pulse-soft" />
              <span className="text-[color:var(--brand-cyan)] font-medium">Syncing</span>
            </>
          )}
        </div>
        <Button variant="ghost" size="sm">Manage</Button>
      </div>
    </motion.div>
  );
}
