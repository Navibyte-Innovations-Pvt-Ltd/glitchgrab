"use client";

import { useState, useRef, useEffect, type CSSProperties, type ReactNode } from "react";
import type { ReportButtonProps, UseGlitchgrabReturn } from "./types";
import { useGlitchgrab } from "./provider";

/** Safe version of useGlitchgrab that returns null when outside provider */
function useGlitchgrabSafe(): UseGlitchgrabReturn | null {
  try {
    return useGlitchgrab();
  } catch {
    return null;
  }
}

export function ReportButton({
  position = "bottom-right",
  label = "Report Bug",
  className,
  children,
}: ReportButtonProps & {
  /** Render prop — receives { onClick, capturing } so you can use your own trigger button */
  children?: (props: { onClick: () => void; capturing: boolean }) => ReactNode;
}) {
  const [capturing, setCapturing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const glitchgrab = useGlitchgrabSafe();

  // If no provider context, render nothing
  if (!glitchgrab) return null;

  const { reportBug } = glitchgrab;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setScreenshot(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const retakeScreenshot = async () => {
    setPreviewOpen(false);
    setIsOpen(false);
    setScreenshot(null);
    // Small delay so the modal is gone before capture
    await new Promise((r) => setTimeout(r, 300));
    try {
      const { default: html2canvas } = await import("html2canvas-pro");
      const canvas = await html2canvas(document.body, {
        scale: 0.5,
        logging: false,
        useCORS: true,
        allowTaint: true,
      });
      setScreenshot(canvas.toDataURL("image/jpeg", 0.6));
    } catch {
      // silently fail
    }
    setIsOpen(true);
  };

  const handleOpen = async () => {
    setCapturing(true);
    setSubmitted(false);
    try {
      const { default: html2canvas } = await import("html2canvas-pro");
      const canvas = await html2canvas(document.body, {
        scale: 0.5,
        logging: false,
        useCORS: true,
        allowTaint: true,
      });
      setScreenshot(canvas.toDataURL("image/jpeg", 0.6));
    } catch {
      // screenshot failed — open without it
    }
    setCapturing(false);
    setIsOpen(true);
  };

  // Close modal on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (previewOpen) setPreviewOpen(false);
        else setIsOpen(false);
      }
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, previewOpen]);

  const handleSubmit = () => {
    try {
      if (!description.trim() || isSubmitting) return;

      setIsSubmitting(true);
      reportBug(description.trim(), screenshot ? { screenshot } : undefined);

      setSubmitted(true);
      setDescription("");
      setScreenshot(null);
      setIsSubmitting(false);

      setTimeout(() => {
        setSubmitted(false);
        setIsOpen(false);
      }, 2000);
    } catch {
      setIsSubmitting(false);
    }
  };

  const isTop = position?.startsWith("top") ?? false;
  const isLeft = position?.endsWith("left") ?? false;

  const modalPositionStyles: CSSProperties = children
    ? {} // user controls positioning
    : {
        ...(isLeft ? { left: "16px" } : { right: "16px" }),
        ...(isTop ? { top: "64px" } : { bottom: "64px" }),
      };

  return (
    <>
      {/* Trigger: user's custom button OR default floating button */}
      {children ? (
        children({ onClick: handleOpen, capturing })
      ) : (
        <DefaultTrigger
          onClick={handleOpen}
          capturing={capturing}
          label={label}
          className={className}
          position={position}
          isLeft={isLeft}
          isTop={isTop}
        />
      )}

      {/* Report modal */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0,0,0,0.5)",
          }}
          onClick={() => { if (!previewOpen) setIsOpen(false); }}
        >
          <div
            ref={modalRef}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: children ? "relative" : "fixed",
              ...modalPositionStyles,
              zIndex: 100000,
              width: "340px",
              maxWidth: "calc(100% - 32px)",
              backgroundColor: "#1c1c1e",
              borderRadius: "12px",
              boxShadow:
                "0 20px 60px rgba(0, 0, 0, 0.4), 0 4px 16px rgba(0, 0, 0, 0.3)",
              fontFamily:
                '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              overflow: "hidden",
              color: "#fafafa",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "16px 16px 12px",
                borderBottom: "1px solid #2c2c2e",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontSize: "15px",
                    fontWeight: 600,
                    color: "#fafafa",
                  }}
                >
                  Report a Bug
                </span>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "4px",
                    color: "#a1a1aa",
                    fontSize: "18px",
                    lineHeight: 1,
                  }}
                  aria-label="Close"
                >
                  &times;
                </button>
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: "16px" }}>
              {submitted ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "20px 0",
                    color: "#22d3ee",
                    fontSize: "14px",
                    fontWeight: 500,
                  }}
                >
                  Bug report sent. Thank you!
                </div>
              ) : (
                <>
                  {/* Screenshot preview */}
                  {screenshot && (
                    <div style={{ marginBottom: "10px", position: "relative" }}>
                      <img
                        src={screenshot}
                        alt="Page screenshot"
                        onClick={() => setPreviewOpen(true)}
                        style={{
                          width: "100%",
                          borderRadius: "6px",
                          border: "1px solid #2c2c2e",
                          maxHeight: "120px",
                          objectFit: "cover",
                          objectPosition: "top",
                          cursor: "pointer",
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setScreenshot(null)}
                        style={{
                          position: "absolute",
                          top: "4px",
                          right: "4px",
                          background: "rgba(0,0,0,0.6)",
                          border: "none",
                          borderRadius: "50%",
                          color: "#fff",
                          width: "20px",
                          height: "20px",
                          fontSize: "12px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          lineHeight: 1,
                        }}
                        aria-label="Remove screenshot"
                      >
                        &times;
                      </button>
                      <div
                        style={{
                          position: "absolute",
                          bottom: "4px",
                          left: "6px",
                          right: "6px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span
                          style={{
                            background: "rgba(0,0,0,0.6)",
                            color: "#fff",
                            fontSize: "10px",
                            padding: "2px 6px",
                            borderRadius: "4px",
                          }}
                        >
                          Screenshot ({Math.round(screenshot.length * 0.75 / 1024)}KB) — click to preview
                        </span>
                        <div style={{ display: "flex", gap: "4px" }}>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                              background: "rgba(0,0,0,0.6)",
                              color: "#22d3ee",
                              fontSize: "10px",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              border: "none",
                              cursor: "pointer",
                            }}
                          >
                            Upload
                          </button>
                          <button
                            type="button"
                            onClick={retakeScreenshot}
                            style={{
                              background: "rgba(0,0,0,0.6)",
                              color: "#22d3ee",
                              fontSize: "10px",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              border: "none",
                              cursor: "pointer",
                            }}
                          >
                            Retake
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  {!screenshot && !submitted && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        marginBottom: "10px",
                        padding: "10px",
                        borderRadius: "6px",
                        border: "1px dashed #3f3f46",
                        textAlign: "center",
                        fontSize: "11px",
                        color: "#71717a",
                        width: "100%",
                        background: "none",
                        cursor: "pointer",
                      }}
                    >
                      Click to upload a screenshot
                    </button>
                  )}
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what went wrong..."
                    style={{
                      width: "100%",
                      minHeight: "100px",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid #3f3f46",
                      fontSize: "14px",
                      fontFamily: "inherit",
                      resize: "vertical",
                      outline: "none",
                      boxSizing: "border-box",
                      color: "#fafafa",
                      backgroundColor: "#27272a",
                    }}
                    onFocus={(e) => {
                      (e.target as HTMLTextAreaElement).style.borderColor =
                        "#22d3ee";
                    }}
                    onBlur={(e) => {
                      (e.target as HTMLTextAreaElement).style.borderColor =
                        "#3f3f46";
                    }}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!description.trim() || isSubmitting}
                    style={{
                      marginTop: "12px",
                      width: "100%",
                      padding: "10px",
                      borderRadius: "8px",
                      border: "none",
                      backgroundColor:
                        !description.trim() || isSubmitting
                          ? "#3f3f46"
                          : "#22d3ee",
                      color:
                        !description.trim() || isSubmitting
                          ? "#71717a"
                          : "#09090b",
                      fontSize: "14px",
                      fontWeight: 600,
                      cursor:
                        !description.trim() || isSubmitting
                          ? "not-allowed"
                          : "pointer",
                      fontFamily: "inherit",
                      transition: "background-color 0.15s ease",
                    }}
                  >
                    {isSubmitting ? "Sending..." : "Send Report"}
                  </button>
                </>
              )}
            </div>

            {/* Footer */}
            <div
              style={{
                padding: "8px 16px 10px",
                borderTop: "1px solid #2c2c2e",
                textAlign: "center",
              }}
            >
              <span style={{ fontSize: "11px", color: "#52525b" }}>
                Powered by Glitchgrab
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file input for screenshot upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        style={{ display: "none" }}
      />

      {/* Full-screen screenshot preview */}
      {previewOpen && screenshot && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200000,
            backgroundColor: "rgba(0,0,0,0.85)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
            cursor: "pointer",
          }}
          onClick={(e) => { e.stopPropagation(); setPreviewOpen(false); }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <img
            src={screenshot}
            alt="Screenshot preview"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "100%",
              maxHeight: "calc(100vh - 80px)",
              borderRadius: "8px",
              objectFit: "contain",
              cursor: "default",
            }}
          />
          <span
            style={{
              marginTop: "12px",
              color: "#a1a1aa",
              fontSize: "12px",
            }}
          >
            Click outside to close
          </span>
        </div>
      )}
    </>
  );
}

/** Default floating trigger button (used when no children provided) */
function DefaultTrigger({
  onClick,
  capturing,
  label,
  className,
  position,
  isLeft,
  isTop,
}: {
  onClick: () => void;
  capturing: boolean;
  label: string;
  className?: string;
  position?: string;
  isLeft: boolean;
  isTop: boolean;
}) {
  const positionStyles: CSSProperties = {
    ...(isLeft ? { left: "16px" } : { right: "16px" }),
    ...(isTop ? { top: "16px" } : { bottom: "16px" }),
  };

  return (
    <button
      type="button"
      onClick={onClick}
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
