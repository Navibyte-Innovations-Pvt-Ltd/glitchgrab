"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Copy, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createToken } from "./actions";

interface Repo {
  id: string;
  fullName: string;
}

export function CreateTokenDialog({ repos }: { repos: Repo[] }) {
  const [open, setOpen] = useState(false);
  const [repoName, setRepoName] = useState(repos[0]?.fullName ?? "");
  const [name, setName] = useState("");
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  const selectedRepoId = repos.find((r) => r.fullName === repoName)?.id ?? "";

  function handleCreate() {
    if (!selectedRepoId) {
      toast.error("Select a repo");
      return;
    }

    startTransition(async () => {
      try {
        const token = await createToken(selectedRepoId, name || "Default");
        setGeneratedToken(token);
        toast.success("Token created!");
      } catch {
        toast.error("Failed to create token");
      }
    });
  }

  async function handleCopy() {
    if (!generatedToken) return;
    await navigator.clipboard.writeText(generatedToken);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  function handleClose(isOpen: boolean) {
    setOpen(isOpen);
    if (!isOpen) {
      setGeneratedToken(null);
      setName("");
      setCopied(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger>
        <span className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition">
          <Plus className="h-4 w-4" />
          Create Token
        </span>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {generatedToken ? "Token Created" : "Create API Token"}
          </DialogTitle>
        </DialogHeader>

        {generatedToken ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Copy this token now — you won&apos;t be able to see it again.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg bg-muted px-3 py-2 text-xs font-mono break-all">
                {generatedToken}
              </code>
              <Button variant="outline" size="icon" onClick={handleCopy}>
                {copied ? (
                  <Check className="h-4 w-4 text-green" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
              <p className="text-xs text-muted-foreground">
                <strong>Usage:</strong> Add this to your Next.js app:
              </p>
              <code className="text-xs font-mono text-primary mt-1 block">
                {`<GlitchgrabProvider token="${generatedToken}">`}
              </code>
            </div>
            <Button onClick={() => handleClose(false)} className="w-full">
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Repo</label>
              <Select value={repoName} onValueChange={(val) => { if (val) setRepoName(val); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a repo" />
                </SelectTrigger>
                <SelectContent>
                  {repos.map((repo) => (
                    <SelectItem key={repo.id} value={repo.fullName}>
                      {repo.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Token Name <span className="text-muted-foreground">(optional)</span>
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Production, Staging"
              />
            </div>
            <Button
              onClick={handleCreate}
              disabled={pending || !selectedRepoId}
              className="w-full"
            >
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                "Generate Token"
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
