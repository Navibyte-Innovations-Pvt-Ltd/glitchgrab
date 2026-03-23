"use client";

import React, { useState, useRef, useEffect } from "react";
import type { ReportButtonProps } from "./types";
import { useGlitchgrab } from "./provider";

export function ReportButton({
  position = "bottom-right",
  label = "Report Bug",
  className,
}: ReportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const { reportBug } = useGlitchgrab();

  // Close modal on outside click
  useEffect(() => {
    try {
      if (!isOpen) return;

      const handleClickOutside = (event: MouseEvent) => {
        if (
          modalRef.current &&
          !modalRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    } catch {
      // Silently fail
    }
  }, [isOpen]);

  const handleSubmit = () => {
    try {
      if (!description.trim() || isSubmitting) return;

      setIsSubmitting(true);
      reportBug(description.trim());

      setSubmitted(true);
      setDescription("");
      setIsSubmitting(false);

      setTimeout(() => {
        setSubmitted(false);
        setIsOpen(false);
      }, 2000);
    } catch {
      setIsSubmitting(false);
    }
  };

  const positionStyles: React.CSSProperties =
    position === "bottom-left"
      ? { left: "16px", bottom: "16px" }
      : { right: "16px", bottom: "16px" };

  const modalPositionStyles: React.CSSProperties =
    position === "bottom-left"
      ? { left: "16px", bottom: "64px" }
      : { right: "16px", bottom: "64px" };

  return (
    <>
      {/* Floating trigger button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setSubmitted(false);
        }}
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
          viewBox="0 0 16 16"
          fill="none"
          style={{ flexShrink: 0 }}
        >
          <path
            d="M8 1C4.134 1 1 4.134 1 8s3.134 7 7 7 7-3.134 7-7-3.134-7-7-7zm0 12.5a.75.75 0 110-1.5.75.75 0 010 1.5zm.75-3.5a.75.75 0 01-1.5 0V5a.75.75 0 011.5 0v5z"
            fill="currentColor"
          />
        </svg>
        {label}
      </button>

      {/* Report modal */}
      {isOpen && (
        <div
          ref={modalRef}
          style={{
            position: "fixed",
            ...modalPositionStyles,
            zIndex: 100000,
            width: "320px",
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            boxShadow:
              "0 20px 60px rgba(0, 0, 0, 0.15), 0 4px 16px rgba(0, 0, 0, 0.1)",
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "16px 16px 12px",
              borderBottom: "1px solid #e4e4e7",
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
                  color: "#18181b",
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
                  color: "#71717a",
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
                  color: "#16a34a",
                  fontSize: "14px",
                  fontWeight: 500,
                }}
              >
                Bug report sent. Thank you!
              </div>
            ) : (
              <>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what went wrong..."
                  style={{
                    width: "100%",
                    minHeight: "100px",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid #d4d4d8",
                    fontSize: "14px",
                    fontFamily: "inherit",
                    resize: "vertical",
                    outline: "none",
                    boxSizing: "border-box",
                    color: "#18181b",
                    backgroundColor: "#fafafa",
                  }}
                  onFocus={(e) => {
                    (e.target as HTMLTextAreaElement).style.borderColor =
                      "#18181b";
                  }}
                  onBlur={(e) => {
                    (e.target as HTMLTextAreaElement).style.borderColor =
                      "#d4d4d8";
                  }}
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
                        ? "#a1a1aa"
                        : "#18181b",
                    color: "#fafafa",
                    fontSize: "14px",
                    fontWeight: 500,
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
              borderTop: "1px solid #e4e4e7",
              textAlign: "center",
            }}
          >
            <span style={{ fontSize: "11px", color: "#a1a1aa" }}>
              Powered by Glitchgrab
            </span>
          </div>
        </div>
      )}
    </>
  );
}
