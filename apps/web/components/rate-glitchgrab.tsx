"use client";

import { FeedbackButton } from "glitchgrab";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Trigger for the SDK feedback dialog (#309).
 *
 * glitchgrab.dev is itself an SDK consumer, so a rating left here lands on the
 * Feedback page of the account holding NEXT_PUBLIC_GLITCHGRAB_TOKEN — the same
 * path any customer's end-users take. Works signed out; the dialog lives inside
 * GlitchgrabSDKProvider, so this is only the trigger.
 */
export function RateGlitchgrabLink({
  className,
  label = "Rate us",
}: { className?: string; label?: string } = {}) {
  return (
    <FeedbackButton>
      {({ onClick }: { onClick: () => void }) => (
        <button
          type="button"
          onClick={onClick}
          className={cn(
            "text-muted-foreground hover:text-primary transition-colors text-left",
            className
          )}
        >
          {label}
        </button>
      )}
    </FeedbackButton>
  );
}

/** Top-nav variant, matching the `/features` `/docs` command styling. */
export function RateGlitchgrabNavLink() {
  return (
    <FeedbackButton>
      {({ onClick }: { onClick: () => void }) => (
        <button
          type="button"
          onClick={onClick}
          className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-amber-400 transition-colors"
        >
          <Star className="h-3.5 w-3.5" />
          feedback
        </button>
      )}
    </FeedbackButton>
  );
}
