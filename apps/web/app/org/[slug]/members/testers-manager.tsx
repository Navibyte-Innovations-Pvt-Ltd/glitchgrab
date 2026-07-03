"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Loader2, Copy, Trash2, Plus, FlaskConical, Pencil } from "lucide-react";

interface Repo {
  id: string;
  fullName: string;
}

interface Tester {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  qaUrl: string;
  repos: Repo[];
  checkCount: number;
  createdAt: string;
}

export function TestersManager({
  orgSlug,
  initialTesters,
  repos,
}: {
  orgSlug: string;
  initialTesters: Tester[];
  repos: Repo[];
}) {
  const queryClient = useQueryClient();
  const queryKey = ["org-testers", orgSlug];
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingTester, setEditingTester] = useState<Tester | null>(null);

  const { data: testers = [] } = useQuery<Tester[]>({
    queryKey,
    queryFn: async () => {
      const { data } = await axios.get(`/api/v1/orgs/${orgSlug}/testers`);
      return data.data as Tester[];
    },
    initialData: initialTesters,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`/api/v1/orgs/${orgSlug}/testers/${id}`);
    },
    onSuccess: () => {
      toast.success("Tester removed");
      queryClient.invalidateQueries({ queryKey });
    },
    onError: () => toast.error("Failed to remove tester"),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-2">
          <FlaskConical className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div>
            <h2 className="text-xl font-semibold text-foreground">Testers</h2>
            <p className="text-sm text-muted-foreground mt-0.5 max-w-xl">
              QA testers verify fixes after a PR merges. No GitHub account needed — they sign in
              with a WhatsApp OTP or open the private link we send them.
            </p>
          </div>
        </div>
        <Button onClick={() => setSheetOpen(true)} className="shrink-0">
          <Plus className="h-4 w-4" />
          Add tester
        </Button>
      </div>

      <div className="space-y-3">
        {testers.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card/40 px-4 py-8 text-center text-sm text-muted-foreground">
            No testers yet. Click <span className="font-medium text-foreground">Add tester</span> to invite one.
          </div>
        ) : (
          testers.map((t) => (
            <TesterRow
              key={t.id}
              tester={t}
              onDelete={() => deleteMutation.mutate(t.id)}
              deleting={deleteMutation.isPending && deleteMutation.variables === t.id}
              onEdit={() => setEditingTester(t)}
            />
          ))
        )}
      </div>

      <AddTesterSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        orgSlug={orgSlug}
        repos={repos}
        onAdded={() => {
          queryClient.invalidateQueries({ queryKey });
          setSheetOpen(false);
        }}
      />

      <EditTesterSheet
        tester={editingTester}
        onOpenChange={(v) => !v && setEditingTester(null)}
        orgSlug={orgSlug}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey });
          setEditingTester(null);
        }}
      />
    </div>
  );
}

function AddTesterSheet({
  open,
  onOpenChange,
  orgSlug,
  repos,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orgSlug: string;
  repos: Repo[];
  onAdded: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState<string | undefined>("");
  const [email, setEmail] = useState("");
  const [selectedRepos, setSelectedRepos] = useState<string[]>([]);

  const reset = () => {
    setName("");
    setPhone("");
    setEmail("");
    setSelectedRepos([]);
  };

  const addMutation = useMutation({
    mutationFn: async () => {
      const { data } = await axios.post(`/api/v1/orgs/${orgSlug}/testers`, {
        name: name.trim(),
        phone,
        email: email.trim() || undefined,
        repoIds: selectedRepos,
      });
      return data;
    },
    onSuccess: () => {
      toast.success("Tester added");
      reset();
      onAdded();
    },
    onError: (err) => {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : "Failed to add tester";
      toast.error(msg ?? "Failed to add tester");
    },
  });

  const toggleRepo = (id: string) =>
    setSelectedRepos((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-6 pt-6">
          <SheetTitle>Add a tester</SheetTitle>
          <SheetDescription>
            They&apos;ll sign in with this WhatsApp number (OTP) and get verification requests here.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="tester-name">Name</Label>
            <Input
              id="tester-name"
              placeholder="Pradeep"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tester-phone">WhatsApp number</Label>
            <PhoneInput id="tester-phone" value={phone} onChange={setPhone} />
            <p className="text-[11px] text-muted-foreground">Used for OTP login + notifications.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tester-email">Email (optional)</Label>
            <Input
              id="tester-email"
              type="email"
              placeholder="pradeep@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Assign repos</Label>
            {repos.length === 0 ? (
              <p className="text-xs text-muted-foreground">No repos connected to this org yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {repos.map((r) => {
                  const active = selectedRepos.includes(r.id);
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => toggleRepo(r.id)}
                      className={cn(
                        "font-mono text-[11px] px-2 py-1 rounded border transition-colors text-left",
                        active
                          ? "text-primary border-primary/40 bg-primary/10"
                          : "text-muted-foreground border-border bg-muted hover:border-primary/30"
                      )}
                    >
                      {r.fullName.split("/").pop()}
                    </button>
                  );
                })}
              </div>
            )}
            {selectedRepos.length > 0 && (
              <p className="text-[11px] text-muted-foreground">{selectedRepos.length} selected</p>
            )}
          </div>
        </div>

        <SheetFooter className="px-6 pb-6 pt-2 border-t border-border">
          <Button
            onClick={() => addMutation.mutate()}
            disabled={addMutation.isPending || !name.trim()}
            className="w-full"
          >
            {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add tester
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function EditTesterSheet({
  tester,
  onOpenChange,
  orgSlug,
  onSaved,
}: {
  tester: Tester | null;
  onOpenChange: (v: boolean) => void;
  orgSlug: string;
  onSaved: () => void;
}) {
  const [name, setName] = useState(tester?.name ?? "");
  const [phone, setPhone] = useState<string | undefined>(tester?.phone ?? "");
  const [email, setEmail] = useState(tester?.email ?? "");

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!tester) return;
      const { data } = await axios.patch(`/api/v1/orgs/${orgSlug}/testers/${tester.id}`, {
        name: name.trim(),
        phone,
        email: email.trim() || undefined,
      });
      return data;
    },
    onSuccess: () => {
      toast.success("Tester updated");
      onSaved();
    },
    onError: (err) => {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : "Failed to update tester";
      toast.error(msg ?? "Failed to update tester");
    },
  });

  return (
    <Sheet open={!!tester} onOpenChange={onOpenChange}>
      <SheetContent key={tester?.id} className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-6 pt-6">
          <SheetTitle>Edit tester</SheetTitle>
          <SheetDescription>
            Fix a wrong number or update contact details. Repo assignment stays the same.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="edit-tester-name">Name</Label>
            <Input
              id="edit-tester-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-tester-phone">WhatsApp number</Label>
            <PhoneInput id="edit-tester-phone" value={phone} onChange={setPhone} />
            <p className="text-[11px] text-muted-foreground">Used for OTP login + notifications.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-tester-email">Email (optional)</Label>
            <Input
              id="edit-tester-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <SheetFooter className="px-6 pb-6 pt-2 border-t border-border">
          <Button
            onClick={() => editMutation.mutate()}
            disabled={editMutation.isPending || !name.trim()}
            className="w-full"
          >
            {editMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save changes
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function TesterRow({
  tester,
  onDelete,
  deleting,
  onEdit,
}: {
  tester: Tester;
  onDelete: () => void;
  deleting: boolean;
  onEdit: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(tester.qaUrl);
      toast.success("QA link copied");
    } catch {
      toast.error("Couldn't copy");
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium text-foreground">{tester.name}</div>
          <div className="text-[11px] font-mono text-muted-foreground/70 space-x-2">
            {tester.phone && <span>+{tester.phone}</span>}
            {tester.email && <span>{tester.email}</span>}
            <span>{tester.checkCount} check{tester.checkCount === 1 ? "" : "s"}</span>
          </div>
          {tester.repos.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {tester.repos.map((r) => (
                <span
                  key={r.id}
                  className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-border bg-muted text-muted-foreground"
                >
                  {r.fullName.split("/").pop()}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button size="sm" variant="ghost" onClick={onEdit} title="Edit tester">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={copyLink} title="Copy QA link">
            <Copy className="h-4 w-4" />
          </Button>
          {confirming ? (
            <Button size="sm" variant="destructive" onClick={onDelete} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm"}
            </Button>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setConfirming(true)} title="Remove tester">
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
