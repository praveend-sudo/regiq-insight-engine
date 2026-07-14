import { useState } from "react";
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

export function EmailSummaryDialog({
  open,
  onOpenChange,
  defaultSubject,
  defaultBody,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultSubject: string;
  defaultBody: string;
}) {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);

  const send = () => {
    if (!to) {
      toast.error("Enter a recipient");
      return;
    }
    toast.success(`Summary sent to ${to}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Email compliance summary</DialogTitle>
          <DialogDescription>
            Share this answer with a colleague, auditor, or board member.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>To</Label>
            <Input type="email" placeholder="board@bank.lk" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <Label>Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div>
            <Label>Body</Label>
            <Textarea rows={10} value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="bg-gradient-brand text-white" onClick={send}>Send email</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
