import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  listSharesForChat,
  shareChat,
  updateSharePermission,
  revokeShare,
  type ShareRow,
} from "@/lib/shares.functions";
import { toast } from "sonner";
import { Loader2, Trash2, Users } from "lucide-react";

type Props = {
  chatId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export function ShareChatDialog({ chatId, open, onOpenChange }: Props) {
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<"view" | "edit">("view");
  const [shares, setShares] = useState<ShareRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);

  const listFn = useServerFn(listSharesForChat);
  const shareFn = useServerFn(shareChat);
  const updateFn = useServerFn(updateSharePermission);
  const revokeFn = useServerFn(revokeShare);

  useEffect(() => {
    if (!open || !chatId) return;
    setLoading(true);
    listFn({ data: { chat_id: chatId } })
      .then(setShares)
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load shares"))
      .finally(() => setLoading(false));
  }, [open, chatId, listFn]);

  async function onShare() {
    if (!chatId || !email.trim()) return;
    setSharing(true);
    try {
      const row = await shareFn({ data: { chat_id: chatId, email: email.trim(), permission } });
      setShares((prev) => {
        const filtered = prev.filter((s) => s.id !== row.id);
        return [...filtered, row];
      });
      setEmail("");
      toast.success("Chat shared");
      // refresh to get recipient info
      const fresh = await listFn({ data: { chat_id: chatId } });
      setShares(fresh);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Share failed");
    } finally {
      setSharing(false);
    }
  }

  async function onRevoke(id: string) {
    try {
      await revokeFn({ data: { id } });
      setShares((prev) => prev.filter((s) => s.id !== id));
      toast.success("Access revoked");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Revoke failed");
    }
  }

  async function onChangePerm(id: string, perm: "view" | "edit") {
    try {
      await updateFn({ data: { id, permission: perm } });
      setShares((prev) => prev.map((s) => (s.id === id ? { ...s, permission: perm } : s)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> Share chat
          </DialogTitle>
          <DialogDescription>
            Give another RegIQ user access to this chat by their account email.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-[1fr_120px_auto] gap-2 items-end">
            <div className="space-y-1">
              <Label htmlFor="share-email">Email</Label>
              <Input
                id="share-email"
                type="email"
                placeholder="colleague@bank.lk"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Permission</Label>
              <Select value={permission} onValueChange={(v) => setPermission(v as "view" | "edit")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">Can view</SelectItem>
                  <SelectItem value="edit">Can edit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={onShare} disabled={sharing || !email.trim() || !chatId}>
              {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Share"}
            </Button>
          </div>

          <div className="border-t pt-3">
            <div className="text-sm font-medium mb-2">People with access</div>
            {loading ? (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : shares.length === 0 ? (
              <div className="text-sm text-muted-foreground">Not shared with anyone yet.</div>
            ) : (
              <ul className="space-y-2">
                {shares.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-2 rounded-md border p-2"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {s.recipient_name || s.recipient_email || s.shared_with}
                      </div>
                      {s.recipient_email && (
                        <div className="text-xs text-muted-foreground truncate">
                          {s.recipient_email}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={s.permission}
                        onValueChange={(v) => onChangePerm(s.id, v as "view" | "edit")}
                      >
                        <SelectTrigger className="h-8 w-[110px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="view">Can view</SelectItem>
                          <SelectItem value="edit">Can edit</SelectItem>
                        </SelectContent>
                      </Select>
                      <Badge variant="secondary" className="hidden sm:inline-flex">
                        {new Date(s.created_at).toLocaleDateString()}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onRevoke(s.id)}
                        aria-label="Revoke access"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
