"use client";

import { useGlitchgrab } from "glitchgrab";
import { CalendarClock } from "lucide-react";

/**
 * `useGlitchgrab` throws outside a provider, and the provider is a passthrough
 * when no token is configured — which is the case during a production build,
 * where `NEXT_PUBLIC_GLITCHGRAB_TOKEN` is not present. Prerendering the home
 * page then failed the whole build.
 *
 * Booking is an enhancement, not the page: with no provider we render nothing
 * rather than taking the marketing site down with us.
 */
function useGlitchgrabSafe() {
  try {
    return useGlitchgrab();
  } catch {
    return null;
  }
}

/**
 * "Book a demo" on our own marketing site.
 *
 * Dogfooding the same dialog customers embed: it reads our real Google
 * availability, creates a Meet on our calendar, and records the call — so every
 * rough edge is one we hit before a customer does.
 *
 * The dialog itself lives in the SDK provider mounted in the root layout; this
 * is only the trigger.
 */
export function BookDemoCta({
  variant = "primary",
}: {
  variant?: "primary" | "ghost";
}) {
  const glitchgrab = useGlitchgrabSafe();
  if (!glitchgrab) return null;

  const { openBookingDialog } = glitchgrab;

  if (variant === "ghost") {
    return (
      <button
        onClick={openBookingDialog}
        className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        Book a demo
      </button>
    );
  }

  return (
    <button
      onClick={openBookingDialog}
      className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-mono text-sm px-4 py-2.5 rounded-md hover:opacity-90 transition-opacity"
    >
      <CalendarClock className="w-4 h-4" />
      Book a demo
    </button>
  );
}
