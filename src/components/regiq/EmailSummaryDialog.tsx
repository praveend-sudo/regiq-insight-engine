import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Mail, Copy } from "lucide-react";

export function EmailSummaryDialog({
  open,
  onOpenChange,
  defaultSubject,
  defaultBody,
  title = "Email compliance summary",
  description = "Opens your default mail client with this content pre-filled.",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultSubject: string;
  defaultBody: string;
  title?: string;
  description?: string;
}) {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);

  useEffect(() => {
    if (open) {
      setSubject(defaultSubject);
      setBody(defaultBody);
    }
  }, [open, defaultSubject, defaultBody]);

  const send = () => {
    const url = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;
    window.location.href = url;
    toast.success("Opening your mail client…");
    onOpenChange(false);
  };

  const copyAll = async () => {
    await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
    toast.success("Copied to clipboard");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>To (optional)</Label>
            <Input
              type="email"
              placeholder="board@bank.lk"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <div>
            <Label>Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div>
            <Label>Body</Label>
            <Textarea rows={12} value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={copyAll} className="gap-1.5">
            <Copy className="h-4 w-4" /> Copy
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="bg-gradient-brand text-white gap-1.5" onClick={send}>
            <Mail className="h-4 w-4" /> Open email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
