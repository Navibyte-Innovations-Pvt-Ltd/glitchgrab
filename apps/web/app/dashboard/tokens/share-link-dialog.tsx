"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, Copy, Link2, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { generateShareLink, revokeShareLink } from "./actions";
import { copyToClipboard } from "@/lib/clipboard";

interface ShareLinkDialogProps {
  tokenId: string;
  shareSlug: string | null;
  baseUrl: string;
}

export function ShareLinkDialog({
  tokenId,
  shareSlug: initialSlug,
  baseUrl,
}: ShareLinkDialogProps) {
  const [open, setOpen] = useState(false);
  const [shareSlug, setShareSlug] = useState(initialSlug);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  const url = shareSlug ? `${baseUrl}/report/${shareSlug}` : "";

  function handleGenerate() {
    startTransition(async () => {
      try {
        const slug = await generateShareLink(tokenId);
        setShareSlug(slug);
        toast.success(
          initialSlug ? "Link regenerated — old link no longer works" : "Share link created"
        );
      } catch {
        toast.error("Failed to create share link");
      }
    });
  }

  function handleRevoke() {
    startTransition(async () => {
      try {
        await revokeShareLink(tokenId);
        setShareSlug(null);
        toast.success("Share link revoked");
      } catch {
        toast.error("Failed to revoke share link");
      }
    });
  }

  async function handleCopy() {
    if (!url) return;
    await copyToClipboard(url);
    setCopied(true);
    toast.success("Copied link");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="outline"
        size="icon"
        aria-label="Share report link"
        onClick={() => setOpen(true)}
      >
        <Link2 className="h-4 w-4" />
      </Button>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm text-foreground uppercase tracking-widest flex items-center gap-2">
            <Link2 className="h-4 w-4 text-primary" />
            tester_report_link
          </DialogTitle>
          <p className="font-mono text-[11px] text-muted-foreground mt-1">
            no-login page — anyone with this link can submit a report directly
          </p>
        </DialogHeader>

        {shareSlug ? (
          <div className="space-y-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">
                link
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded border border-border bg-card px-3 py-2 text-xs font-mono break-all text-foreground">
                  {url}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  aria-label="Copy link"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleGenerate}
                disabled={pending}
                className="flex-1 font-mono text-xs uppercase tracking-wider"
              >
                {pending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                )}
                Regenerate
              </Button>
              <Button
                variant="destructive"
                onClick={handleRevoke}
                disabled={pending}
                className="flex-1 font-mono text-xs uppercase tracking-wider"
              >
                {pending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                )}
                Revoke
              </Button>
            </div>
          </div>
        ) : (
          <Button
            onClick={handleGenerate}
            disabled={pending}
            className="w-full font-mono text-xs uppercase tracking-wider"
          >
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Generating...
              </>
            ) : (
              <>
                <Link2 className="h-3.5 w-3.5 mr-1.5" />
                Generate Share Link
              </>
            )}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
