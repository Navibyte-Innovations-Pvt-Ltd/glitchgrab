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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Check,
  ChevronDown,
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
  const [copied, setCopied] = useState<"token" | "env" | null>(null);
  const [pending, startTransition] = useTransition();
  const [repoPickerOpen, setRepoPickerOpen] = useState(false);
  const [repoSearch, setRepoSearch] = useState("");

  const envLine = generatedToken
    ? `NEXT_PUBLIC_GLITCHGRAB_TOKEN=${generatedToken}`
    : "";

  const selectedRepoId = repos.find((r) => r.fullName === repoName)?.id ?? "";
  const filteredRepos = repos.filter((r) =>
    r.fullName.toLowerCase().includes(repoSearch.toLowerCase())
  );

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

  async function handleCopy(kind: "token" | "env") {
    if (!generatedToken) return;
    const value = kind === "env" ? envLine : generatedToken;
    await copyToClipboard(value);
    setCopied(kind);
    toast.success(kind === "env" ? "Copied .env line" : "Copied token");
    setTimeout(() => setCopied(null), 2000);
  }

  function handleClose(isOpen: boolean) {
    setOpen(isOpen);
    if (!isOpen) {
      setGeneratedToken(null);
      setName("");
      setCopied(null);
      setRepoSearch("");
      setRepoPickerOpen(false);
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
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">
                token
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded border border-border bg-card px-3 py-2 text-xs font-mono break-all text-foreground">
                  {generatedToken}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopy("token")}
                  aria-label="Copy token"
                >
                  {copied === "token" ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">
                .env line
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded border border-border bg-card px-3 py-2 text-xs font-mono break-all text-foreground">
                  {envLine}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopy("env")}
                  aria-label="Copy as .env line"
                >
                  {copied === "env" ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="rounded border border-primary/30 bg-primary/5 p-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-primary/80 mb-2">
                usage · next.js
              </p>
              <code className="text-[11px] font-mono text-foreground block break-all">
                {`<GlitchgrabProvider token={process.env.NEXT_PUBLIC_GLITCHGRAB_TOKEN}>`}
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
              <Popover
                open={repoPickerOpen}
                onOpenChange={(isOpen) => {
                  setRepoPickerOpen(isOpen);
                  if (!isOpen) setRepoSearch("");
                }}
              >
                <PopoverTrigger className="flex w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-2.5 py-2 font-mono text-sm text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <span className="truncate flex-1 text-left">
                    {repoName || "Select a repo"}
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                </PopoverTrigger>
                <PopoverContent align="start" side="bottom" className="w-[--anchor-width] p-0">
                  <div className="p-2 border-b border-border">
                    <input
                      type="text"
                      value={repoSearch}
                      onChange={(e) => setRepoSearch(e.target.value)}
                      placeholder="Search repos..."
                      className="w-full bg-transparent font-mono text-sm outline-none placeholder:text-muted-foreground"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto p-1">
                    {filteredRepos.map((repo) => (
                      <button
                        key={repo.id}
                        type="button"
                        onClick={() => {
                          setRepoName(repo.fullName);
                          setRepoPickerOpen(false);
                          setRepoSearch("");
                        }}
                        className="flex items-center justify-between w-full rounded px-2 py-1.5 font-mono text-xs text-foreground hover:bg-muted transition"
                      >
                        <span className="break-all text-left">{repo.fullName}</span>
                        {repoName === repo.fullName && (
                          <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                        )}
                      </button>
                    ))}
                    {filteredRepos.length === 0 && (
                      <p className="font-mono text-xs text-muted-foreground text-center py-3">
                        No repos found
                      </p>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
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
