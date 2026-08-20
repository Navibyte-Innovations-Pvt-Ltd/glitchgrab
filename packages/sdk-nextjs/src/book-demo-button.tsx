"use client";

import type { ReactNode } from "react";
import { useGlitchgrab } from "./provider";

/**
 * Trigger for the demo booking dialog.
 *
 * The dialog itself lives in `GlitchgrabProvider`; this is only a convenience.
 * Most hosts will want their own button in their own design, which is what the
 * render prop is for — or skip this entirely and call
 * `useGlitchgrab().openBookingDialog()`.
 *
 * @example
 * ```tsx
 * <BookDemoButton />
 *
 * <BookDemoButton>
 *   {({ onClick }) => <MyCta onClick={onClick}>Talk to us</MyCta>}
 * </BookDemoButton>
 * ```
 */
export function BookDemoButton({
  label = "Book a demo",
  className,
  children,
}: {
  label?: string;
  className?: string;
  children?: (props: { onClick: () => void }) => ReactNode;
}) {
  const { openBookingDialog } = useGlitchgrab();

  if (children) return <>{children({ onClick: openBookingDialog })}</>;

  return (
    <button
      type="button"
      onClick={openBookingDialog}
      className={className}
      style={
        className
          ? undefined
          : {
              padding: "10px 18px",
              borderRadius: 999,
              border: 0,
              background: "#3b82f6",
              color: "#fff",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }
      }
    >
      {label}
    </button>
  );
}
