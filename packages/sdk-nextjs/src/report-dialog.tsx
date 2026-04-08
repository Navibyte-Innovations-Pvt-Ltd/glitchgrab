"use client";

import { useState, useRef, useEffect, type CSSProperties, type ReactNode } from "react";
// @ts-expect-error react-dom types handled by host app
import { createPortal } from "react-dom";
import type { ReportType, ReportSeverity, UseGlitchgrabReturn } from "./types";

/** Detect if the host page uses a dark or light theme */
function useIsDark(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const bg = getComputedStyle(document.body).backgroundColor;
    const match = bg.match(/\d+/g);
    if (match && match.length >= 3) {
      const [r, g, b] = match.map(Number);
      return (r * 299 + g * 587 + b * 114) / 1000 < 128;
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    return true;
  }
}

function getTheme(dark: boolean) {
  return dark
    ? { bg: "#1c1c1e", bgSecondary: "#27272a", border: "#2c2c2e", text: "#fafafa", textMuted: "#a1a1aa", accent: "#22d3ee", accentText: "#09090b", inputBg: "#27272a", inputBorder: "#3f3f46" }
    : { bg: "#ffffff", bgSecondary: "#f4f4f5", border: "#e4e4e7", text: "#18181b", textMuted: "#71717a", accent: "#0891b2", accentText: "#ffffff", inputBg: "#fafafa", inputBorder: "#d4d4d8" };
}

interface ReportDialogProps {
  report: UseGlitchgrabReturn["report"];
  types?: ReportType[];
  showSeverity?: boolean;
}

/**
 * The report dialog — rendered inside GlitchgrabProvider automatically.
 * Opens via the `glitchgrab:open-report` custom event (triggered by `openReportDialog()`).
 */
export function ReportDialog({
  report,
  types,
  showSeverity = true,
}: ReportDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Stepper state
  const [step, setStep] = useState(1);
  const [reportType, setReportType] = useState<ReportType>("BUG");
  const [severity, setSeverity] = useState<ReportSeverity>("medium");

  const availableTypes: ReportType[] = types ?? ["BUG", "FEATURE_REQUEST", "QUESTION", "OTHER"];

  const isDark = useIsDark();
  const t = getTheme(isDark);

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
    setSubmitted(false);
    if (availableTypes.length === 1) {
      setReportType(availableTypes[0]);
      setStep(2);
    }
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
    setIsOpen(true);
  };

  // Listen for programmatic open via openReportDialog()
  useEffect(() => {
    const handler = (e: Event) => {
      if (isOpen) return;
      const detail = (e as CustomEvent).detail;
      if (detail?.description) setDescription(detail.description);
      if (detail?.type) {
        setReportType(detail.type);
        setStep(2);
      }
      handleOpen();
    };
    window.addEventListener("glitchgrab:open-report", handler);
    return () => window.removeEventListener("glitchgrab:open-report", handler);
  }, [isOpen, handleOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (previewOpen) setPreviewOpen(false);
        else handleClose();
      }
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, previewOpen]);

  const handleClose = () => {
    setIsOpen(false);
    setStep(1);
    setReportType("BUG");
    setSeverity("medium");
  };

  const handleSubmit = async () => {
    try {
      if (!description.trim() || isSubmitting) return;

      setIsSubmitting(true);
      const metadata: Record<string, string> = {};
      if (screenshot) metadata.screenshot = screenshot;
      if (showSeverity && reportType === "BUG") {
        metadata.severity = severity;
      }

      const result = await report(reportType, description.trim(), Object.keys(metadata).length > 0 ? metadata : undefined);

      if (result) {
        setSubmitted(true);
        setDescription("");
        setScreenshot(null);

        setTimeout(() => {
          setSubmitted(false);
          handleClose();
        }, 2000);
      }
      setIsSubmitting(false);
    } catch {
      setIsSubmitting(false);
    }
  };

  if (typeof document === "undefined") return null;

  return (
    <>
      {/* Report modal */}
      {isOpen && createPortal(
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2147483647,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0,0,0,0.5)",
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}
          onClick={() => { if (!previewOpen) handleClose(); }}
        >
          <div
            ref={modalRef}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              zIndex: 2147483647,
              width: "340px",
              maxWidth: "calc(100% - 32px)",
              backgroundColor: t.bg,
              borderRadius: "12px",
              boxShadow:
                "0 20px 60px rgba(0, 0, 0, 0.2), 0 4px 16px rgba(0, 0, 0, 0.1)",
              fontFamily:
                '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              overflow: "hidden",
              color: t.text,
              isolation: "isolate",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "16px 16px 12px",
                borderBottom: `1px solid ${t.border}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {step > 1 && (
                    <button
                      type="button"
                      onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "2px",
                        display: "flex",
                        alignItems: "center",
                      }}
                      aria-label="Back"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M10 3L5 8L10 13" stroke={t.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  )}
                  <span
                    style={{
                      fontSize: "15px",
                      fontWeight: 600,
                      color: t.text,
                    }}
                  >
                    {step === 1 ? "What's on your mind?" : step === 2 ? "Tell us more" : "Review & Send"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  aria-label="Close"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ display: "block" }}>
                    <path d="M4 4L12 12M12 4L4 12" stroke={t.textMuted} strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0", marginTop: "12px" }}>
                {[1, 2, 3].map((s, i) => (
                  <div key={s} style={{ display: "flex", alignItems: "center" }}>
                    <div style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: s <= step ? t.accent : t.inputBorder,
                      transition: "background-color 0.2s ease",
                    }} />
                    {i < 2 && (
                      <div style={{
                        width: "40px",
                        height: "2px",
                        backgroundColor: s < step ? t.accent : t.inputBorder,
                        transition: "background-color 0.2s ease",
                      }} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: "16px" }}>
              {submitted ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "20px 0",
                    color: t.accent,
                    fontSize: "14px",
                    fontWeight: 500,
                  }}
                >
                  {getTypeLabel(reportType)} sent. Thank you!
                </div>
              ) : (
                <>
                  {/* Step 1: Category */}
                  {step === 1 && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                      {availableTypes.map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => {
                            setReportType(type);
                            setStep(2);
                          }}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "8px",
                            padding: "16px 8px",
                            borderRadius: "8px",
                            border: `1px solid ${t.inputBorder}`,
                            background: t.inputBg,
                            cursor: "pointer",
                            color: t.text,
                            fontFamily: "inherit",
                            transition: "border-color 0.15s ease",
                          }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = t.accent; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = t.inputBorder; }}
                        >
                          {getTypeIcon(type, t.accent)}
                          <span style={{ fontSize: "13px", fontWeight: 600 }}>{getTypeLabel(type)}</span>
                          <span style={{ fontSize: "11px", color: t.textMuted, lineHeight: "1.3" }}>{getTypeSubtitle(type)}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Step 2: Details */}
                  {step === 2 && (
                    <>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder={getPlaceholder(reportType)}
                        style={{
                          width: "100%",
                          minHeight: "100px",
                          padding: "10px 12px",
                          borderRadius: "8px",
                          border: `1px solid ${t.inputBorder}`,
                          fontSize: "14px",
                          fontFamily: "inherit",
                          resize: "vertical",
                          outline: "none",
                          boxSizing: "border-box",
                          color: t.text,
                          backgroundColor: t.inputBg,
                        }}
                        onFocus={(e) => { (e.target as HTMLTextAreaElement).style.borderColor = t.accent; }}
                        onBlur={(e) => { (e.target as HTMLTextAreaElement).style.borderColor = t.inputBorder; }}
                        autoFocus
                      />
                      {showSeverity && reportType === "BUG" && (
                        <div style={{ marginTop: "10px" }}>
                          <span style={{ fontSize: "12px", color: t.textMuted, marginBottom: "6px", display: "block" }}>Severity</span>
                          <div style={{ display: "flex", gap: "6px" }}>
                            {(["low", "medium", "high"] as ReportSeverity[]).map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => setSeverity(s)}
                                style={{
                                  flex: 1,
                                  padding: "6px 0",
                                  borderRadius: "6px",
                                  border: `1px solid ${severity === s ? t.accent : t.inputBorder}`,
                                  background: severity === s ? t.accent : "transparent",
                                  color: severity === s ? t.accentText : t.text,
                                  fontSize: "12px",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  fontFamily: "inherit",
                                  textTransform: "capitalize",
                                  transition: "all 0.15s ease",
                                }}
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => setStep(3)}
                        disabled={!description.trim()}
                        style={{
                          marginTop: "12px",
                          width: "100%",
                          padding: "10px",
                          borderRadius: "8px",
                          border: "none",
                          backgroundColor: !description.trim() ? t.bgSecondary : t.accent,
                          color: !description.trim() ? t.textMuted : t.accentText,
                          fontSize: "14px",
                          fontWeight: 600,
                          cursor: !description.trim() ? "not-allowed" : "pointer",
                          fontFamily: "inherit",
                          transition: "background-color 0.15s ease",
                        }}
                      >
                        Next
                      </button>
                    </>
                  )}

                  {/* Step 3: Review & Send */}
                  {step === 3 && (
                    <>
                      {/* Summary chips */}
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "12px" }}>
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "4px 10px",
                          borderRadius: "12px",
                          fontSize: "12px",
                          fontWeight: 600,
                          backgroundColor: t.bgSecondary,
                          color: t.text,
                          border: `1px solid ${t.border}`,
                        }}>
                          {getTypeIcon(reportType, t.accent, 12)}
                          {getTypeLabel(reportType)}
                        </span>
                        {showSeverity && reportType === "BUG" && (
                          <span style={{
                            display: "inline-flex",
                            alignItems: "center",
                            padding: "4px 10px",
                            borderRadius: "12px",
                            fontSize: "12px",
                            fontWeight: 600,
                            backgroundColor: severity === "high" ? "#fef2f2" : severity === "medium" ? "#fffbeb" : "#f0fdf4",
                            color: severity === "high" ? "#dc2626" : severity === "medium" ? "#d97706" : "#16a34a",
                            border: `1px solid ${severity === "high" ? "#fecaca" : severity === "medium" ? "#fde68a" : "#bbf7d0"}`,
                            textTransform: "capitalize",
                          }}>
                            {severity}
                          </span>
                        )}
                      </div>

                      {/* Description preview */}
                      <div style={{
                        padding: "10px 12px",
                        borderRadius: "8px",
                        border: `1px solid ${t.inputBorder}`,
                        backgroundColor: t.inputBg,
                        fontSize: "13px",
                        color: t.text,
                        marginBottom: "10px",
                        maxHeight: "80px",
                        overflow: "hidden",
                        lineHeight: "1.4",
                      }}>
                        {description.length > 200 ? description.slice(0, 200) + "..." : description}
                      </div>

                      {/* Screenshot */}
                      {screenshot && (
                        <div style={{ marginBottom: "10px", position: "relative" }}>
                          <img
                            src={screenshot}
                            alt="Page screenshot"
                            onClick={() => setPreviewOpen(true)}
                            style={{
                              width: "100%",
                              borderRadius: "6px",
                              border: `1px solid ${t.border}`,
                              maxHeight: "80px",
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
                              width: "20px",
                              height: "20px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                            aria-label="Remove screenshot"
                          >
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                              <path d="M1 1L9 9M9 1L1 9" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                          </button>
                        </div>
                      )}
                      {!screenshot && (
                        <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                              flex: 1,
                              padding: "8px",
                              borderRadius: "6px",
                              border: `1px dashed ${t.inputBorder}`,
                              textAlign: "center",
                              fontSize: "11px",
                              color: t.textMuted,
                              background: "none",
                              cursor: "pointer",
                            }}
                          >
                            Upload screenshot
                          </button>
                          <button
                            type="button"
                            onClick={retakeScreenshot}
                            style={{
                              flex: 1,
                              padding: "8px",
                              borderRadius: "6px",
                              border: `1px dashed ${t.inputBorder}`,
                              textAlign: "center",
                              fontSize: "11px",
                              color: t.textMuted,
                              background: "none",
                              cursor: "pointer",
                            }}
                          >
                            Retake screenshot
                          </button>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        style={{
                          width: "100%",
                          padding: "10px",
                          borderRadius: "8px",
                          border: "none",
                          backgroundColor: isSubmitting ? t.bgSecondary : t.accent,
                          color: isSubmitting ? t.textMuted : t.accentText,
                          fontSize: "14px",
                          fontWeight: 600,
                          cursor: isSubmitting ? "not-allowed" : "pointer",
                          fontFamily: "inherit",
                          transition: "background-color 0.15s ease",
                        }}
                      >
                        {isSubmitting ? "Sending..." : "Send Report"}
                      </button>
                    </>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div
              style={{
                padding: "8px 16px 10px",
                borderTop: `1px solid ${t.border}`,
                textAlign: "center",
              }}
            >
              <span style={{ fontSize: "11px", color: t.textMuted }}>
                Powered by Glitchgrab
              </span>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        style={{ display: "none" }}
      />

      {/* Full-screen screenshot preview */}
      {previewOpen && screenshot && createPortal(
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2147483647,
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
              color: t.textMuted,
              fontSize: "12px",
            }}
          >
            Click outside to close
          </span>
        </div>,
        document.body
      )}
    </>
  );
}

/* ─── Helpers ─── */

function getTypeLabel(type: ReportType): string {
  switch (type) {
    case "BUG": return "Bug Report";
    case "FEATURE_REQUEST": return "Feature Request";
    case "QUESTION": return "Question";
    case "OTHER": return "Other";
  }
}

function getTypeSubtitle(type: ReportType): string {
  switch (type) {
    case "BUG": return "Something isn't working";
    case "FEATURE_REQUEST": return "Suggest an improvement";
    case "QUESTION": return "Ask a question";
    case "OTHER": return "General feedback";
  }
}

function getPlaceholder(type: ReportType): string {
  switch (type) {
    case "BUG": return "What went wrong?";
    case "FEATURE_REQUEST": return "Describe the feature you'd like...";
    case "QUESTION": return "What would you like to know?";
    case "OTHER": return "Tell us what's on your mind...";
  }
}

function getTypeIcon(type: ReportType, color: string, size = 24): ReactNode {
  const props = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", style: { flexShrink: 0 } as CSSProperties };
  switch (type) {
    case "BUG":
      return <svg {...props}><path d="M8 2L6.5 3.5M16 2L17.5 3.5M3 9H7M17 9H21M12 2a5 5 0 015 5v4a5 5 0 01-10 0V7a5 5 0 015-5zM7 16l-2 3M17 16l2 3" stroke={color} strokeWidth="1.5" strokeLinecap="round" /></svg>;
    case "FEATURE_REQUEST":
      return <svg {...props}><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" /></svg>;
    case "QUESTION":
      return <svg {...props}><circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.5" /><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    case "OTHER":
      return <svg {...props}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" /></svg>;
  }
}
