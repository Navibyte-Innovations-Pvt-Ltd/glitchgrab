"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import type { ReportButtonProps } from "./types";
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
 * Optional trigger button for opening the report dialog.
 *
 * The dialog itself lives inside `GlitchgrabProvider` — you don't need this component
 * unless you want a visible trigger button. You can also open the dialog programmatically
 * via `useGlitchgrab().openReportDialog()`.
 *
 * @example
 * ```tsx
 * // Use the default floating button
 * <ReportButton />
 *
 * // Use your own trigger
 * <ReportButton>
 *   {({ onClick }) => <button onClick={onClick}>Report</button>}
 * </ReportButton>
 *
 * // Or skip ReportButton entirely and use the hook
 * const { openReportDialog } = useGlitchgrab();
 * <button onClick={() => openReportDialog()}>Report</button>
 * ```
 */
export function ReportButton({
  position = "bottom-right",
  label = "Report Bug",
  className,
  children,
}: ReportButtonProps & {
  children?: (props: { onClick: () => void; capturing: boolean }) => ReactNode;
}) {
  const [capturing, setCapturing] = useState(false);
  const glitchgrab = useGlitchgrabSafe();

  if (!glitchgrab) return null;

  const handleClick = async () => {
    setCapturing(true);
    glitchgrab.openReportDialog();
    setCapturing(false);
  };

  // Custom trigger via render prop
  if (children) {
    return <>{children({ onClick: handleClick, capturing })}</>;
  }

  // Default floating button
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
      disabled={capturing}
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
        cursor: capturing ? "wait" : "pointer",
        boxShadow:
          "0 4px 12px rgba(0, 0, 0, 0.15), 0 1px 3px rgba(0, 0, 0, 0.1)",
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
        display: "flex",
        alignItems: "center",
        gap: "6px",
        opacity: capturing ? 0.7 : 1,
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
        viewBox="0 0 16 16"
        fill="none"
        style={{ flexShrink: 0 }}
      >
        <path
          d="M8 1C4.134 1 1 4.134 1 8s3.134 7 7 7 7-3.134 7-7-3.134-7-7-7zm0 12.5a.75.75 0 110-1.5.75.75 0 010 1.5zm.75-3.5a.75.75 0 01-1.5 0V5a.75.75 0 011.5 0v5z"
          fill="currentColor"
        />
      </svg>
      {capturing ? "Capturing..." : label}
    </button>
  );
}
