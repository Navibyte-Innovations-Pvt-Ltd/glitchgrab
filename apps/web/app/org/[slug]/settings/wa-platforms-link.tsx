"use client";

import { useState } from "react";
import { ArrowRight, Loader2, MessageCircle } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { listPlatforms, type PlatformRow } from "@/app/admin/whatsapp-platforms/actions";
import { PlatformsClient } from "@/app/admin/whatsapp-platforms/platforms-client";

/**
 * WhatsApp platform admin, opened as a side sheet rather than a page.
 *
 * Managing a platform is a short errand — top up a wallet, check a price, copy a
 * key — and a full navigation loses the settings page you were reading. The
 * standalone route at /admin/whatsapp-platforms still exists and still works, so
 * a bookmark or a direct link is unaffected.
 *
 * Platforms load on open, not on mount: this sits on a page every owner visits,
 * and only admins can act on it.
 */
export function WaPlatformsLink() {
  const [open, setOpen] = useState(false);
  const [platforms, setPlatforms] = useState<PlatformRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleOpen(next: boolean) {
    setOpen(next);
    if (!next) return;

    setError(null);
    try {
      setPlatforms(await listPlatforms());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load platforms");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void handleOpen(true)}
        className="flex w-full items-center gap-3 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-primary/50 hover:bg-muted/40"
      >
        <div className="rounded-full bg-emerald-500/10 p-2">
          <MessageCircle className="h-4 w-4 text-emerald-500" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">WhatsApp platforms</p>
          <p className="text-xs text-muted-foreground">
            Products reselling our WhatsApp infra — keys, prices, wallets, tenants
          </p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      <Sheet open={open} onOpenChange={(next) => void handleOpen(next)}>
        {/*
          The width overrides need the same `data-[side=right]:` prefix the
          primitive uses. A plain `sm:max-w-3xl` does not conflict with
          `data-[side=right]:sm:max-w-sm` as far as tailwind-merge is concerned,
          so both survive and the narrow default wins — the sheet renders about
          300px wide with every field truncated.

          Wide on purpose: the price editor is a four-column grid and the action
          row carries six controls. Neither is usable in a standard drawer.
        */}
        <SheetContent className="overflow-y-auto p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-4xl">
          <SheetHeader className="px-6 pt-6">
            <SheetTitle>WhatsApp platforms</SheetTitle>
            <SheetDescription>
              Products reselling our WhatsApp infra. Each gets an API key and its own prices.
            </SheetDescription>
          </SheetHeader>

          <div className="pb-6">
            {error && <p className="px-4 text-sm text-destructive">{error}</p>}

            {!platforms && !error && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {platforms && <PlatformsClient initialPlatforms={platforms} hideHeading />}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
