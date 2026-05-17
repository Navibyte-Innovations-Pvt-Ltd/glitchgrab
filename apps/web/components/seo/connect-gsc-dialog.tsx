"use client";

import { useState } from "react";
import { Globe, Loader2, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

interface ConnectGscDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConnectGscDialog({ open, onOpenChange }: ConnectGscDialogProps) {
  const [copied, setCopied] = useState(false);
  const [copying, setCopying] = useState(false);

  async function copyLink() {
    setCopying(true);
    try {
      const { data } = await axios.get("/api/v1/gsc/auth/link");
      if (!data.success) throw new Error(data.error ?? "Failed to get link");
      await navigator.clipboard.writeText(data.data.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    } finally {
      setCopying(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="bg-card border border-border rounded-lg p-6 w-full max-w-sm mx-4 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h3 className="font-mono text-sm text-foreground uppercase tracking-widest mb-1">
            Connect Google Account
          </h3>
          <p className="text-xs text-muted-foreground">
            GSC properties from that account will appear in your workspace.
          </p>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => { window.location.href = "/api/v1/gsc/auth"; }}
            className="w-full flex items-start gap-3 border border-border hover:border-primary/40 rounded-md p-3 text-left transition-colors group"
          >
            <Globe className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <div className="font-mono text-[11px] text-foreground uppercase tracking-wider group-hover:text-primary transition-colors">
                Connect here
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Opens Google sign-in in this browser. Pick any account.
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={copyLink}
            disabled={copying}
            className="w-full flex items-start gap-3 border border-border hover:border-primary/40 rounded-md p-3 text-left transition-colors group disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {copying
              ? <Loader2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5 animate-spin" />
              : copied
              ? <Check className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
              : <Copy className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5 group-hover:text-primary transition-colors" />
            }
            <div>
              <div className="font-mono text-[11px] text-foreground uppercase tracking-wider group-hover:text-primary transition-colors">
                {copying ? "Generating…" : copied ? "Link copied!" : "Copy link"}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Paste in incognito or a different browser. Valid 10 min.
              </div>
            </div>
          </button>
        </div>

        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="w-full font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors pt-1"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
