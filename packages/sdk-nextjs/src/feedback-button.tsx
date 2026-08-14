"use client";

import type { CSSProperties, ReactNode } from "react";
import type { FeedbackButtonProps } from "./types";
import { useGlitchgrab } from "./provider";

/** Safe version of useGlitchgrab that returns null when outside provider */
function useGlitchgrabSafe() {
  try {
    return useGlitchgrab();
  } catch {
    return null;
  }
}

/**
 * Trigger for the built-in feedback dialog (stars + message).
 *
 * The dialog itself lives inside `GlitchgrabProvider` — this is only the visible
 * trigger. Open it programmatically with `useGlitchgrab().openFeedbackDialog()`,
 * or skip the dialog entirely and call `sendFeedback(rating, message)` from your
 * own UI.
 *
 * @example
 * ```tsx
 * // Default floating button
 * <FeedbackButton />
 *
 * // Your own trigger
 * <FeedbackButton>
 *   {({ onClick }) => <button onClick={onClick}>Rate us</button>}
 * </FeedbackButton>
 * ```
 */
export function FeedbackButton({
  position = "bottom-left",
  label = "Feedback",
  className,
  children,
}: FeedbackButtonProps & {
  children?: (props: { onClick: () => void }) => ReactNode;
}) {
  const glitchgrab = useGlitchgrabSafe();

  if (!glitchgrab) return null;

  const handleClick = () => glitchgrab.openFeedbackDialog();

  if (children) {
    return <>{children({ onClick: handleClick })}</>;
  }

  const isTop = position?.startsWith("top") ?? false;
  const isLeft = position?.endsWith("left") ?? false;

  const positionStyles: CSSProperties = {
    ...(isLeft ? { left: "16px" } : { right: "16px" }),
    ...(isTop ? { top: "16px" } : { bottom: "16px" }),
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={className}
      style={{
        position: "fixed",
        ...positionStyles,
        zIndex: 99999,
        padding: "10px 18px",
        borderRadius: "24px",
        border: "none",
        backgroundColor: "#18181b",
        color: "#fafafa",
        fontSize: "14px",
        fontWeight: 500,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        cursor: "pointer",
        boxShadow:
          "0 4px 12px rgba(0, 0, 0, 0.15), 0 1px 3px rgba(0, 0, 0, 0.1)",
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
        display: "flex",
        alignItems: "center",
        gap: "6px",
      }}
      onMouseEnter={(e) => {
        (e.target as HTMLElement).style.transform = "scale(1.05)";
      }}
      onMouseLeave={(e) => {
        (e.target as HTMLElement).style.transform = "scale(1)";
      }}
      aria-label={label}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        style={{ flexShrink: 0 }}
        aria-hidden="true"
      >
        <path
          d="M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3 1.1-6.5L2.6 9.3l6.5-.9L12 2.5z"
          fill="currentColor"
        />
      </svg>
      {label}
    </button>
  );
}
