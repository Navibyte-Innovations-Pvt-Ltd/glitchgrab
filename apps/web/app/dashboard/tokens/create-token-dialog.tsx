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
import {
  Check,
  Copy,
  GitFork,
  KeyRound,
  Loader2,
  Plus,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { createToken } from "./actions";
import { copyToClipboard } from "@/lib/clipboard";

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
    await copyToClipboard(generatedToken);
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
      <DialogTrigger
        render={
          <Button
            variant="default"
            className="gap-2 font-mono text-xs uppercase tracking-wider shrink-0"
          />
        }
      >
        <Plus className="h-3.5 w-3.5" />
        <span>Generate Token</span>
        <span className="hidden sm:inline-flex items-center gap-1 bg-background/40 rounded-xs px-1.5 py-0.5 text-[9px] border border-border/60 text-foreground/70 normal-case tracking-normal">
          <span className="font-mono">⌘N</span>
        </span>
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm text-foreground uppercase tracking-widest flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" />
            {generatedToken ? "token_generated" : "generate_api_token"}
          </DialogTitle>
          <p className="font-mono text-[11px] text-muted-foreground mt-1">
            {generatedToken
              ? "copy now — this is shown exactly once"
              : "scope a new key to a single repository"}
          </p>
        </DialogHeader>

        {generatedToken ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded border border-border bg-card px-3 py-2 text-xs font-mono break-all text-foreground">
                {generatedToken}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopy}
                aria-label="Copy token"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-primary" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="rounded border border-primary/30 bg-primary/5 p-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-primary/80 mb-2">
                usage · next.js
              </p>
              <code className="text-[11px] font-mono text-foreground block break-all">
                {`<GlitchgrabProvider token="${generatedToken}">`}
              </code>
            </div>
            <Button
              onClick={() => handleClose(false)}
              className="w-full font-mono text-xs uppercase tracking-wider"
            >
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <GitFork className="h-3 w-3" />
                repository
              </label>
              <Select
                value={repoName}
                onValueChange={(val) => {
                  if (val) setRepoName(val);
                }}
              >
                <SelectTrigger className="w-full font-mono text-sm">
                  <SelectValue placeholder="Select a repo" />
                </SelectTrigger>
                <SelectContent>
                  {repos.map((repo) => (
                    <SelectItem
                      key={repo.id}
                      value={repo.fullName}
                      className="font-mono text-sm"
                    >
                      {repo.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <Shield className="h-3 w-3" />
                token name{" "}
                <span className="normal-case tracking-normal text-muted-foreground/60">
                  (optional)
                </span>
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Production, Staging"
                className="font-mono text-sm"
              />
            </div>
            <Button
              onClick={handleCreate}
              disabled={pending || !selectedRepoId}
              className="w-full font-mono text-xs uppercase tracking-wider"
            >
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Generate Token
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
