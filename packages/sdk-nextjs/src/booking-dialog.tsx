"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * Demo booking, rendered inside the host app.
 *
 * The customer embeds Glitchgrab, and their visitors book a demo without ever
 * leaving the page — no redirect to a scheduling site, no separate brand in the
 * middle of a sales moment. The SDK token identifies the project, so the server
 * knows whose calendar to read and where to file the recording afterwards.
 *
 * Styled inline for the same reason the report dialog is: this renders inside
 * someone else's stylesheet and must not inherit from it or fight it.
 */

interface Slot {
  startsAt: string;
  endsAt: string;
}

type Step = "slots" | "details" | "code" | "done";

const t = {
  bg: "#141414",
  surface: "#1c1c1c",
  border: "#2a2a2a",
  text: "#e5e5e5",
  muted: "#9aa0a6",
  accent: "#3b82f6",
  danger: "#f87171",
};

/** The visitor's own zone — a demo confirmed in the wrong one is the worst bug this can have. */
function localZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

function dayKey(iso: string): string {
  return new Date(iso).toDateString();
}

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function BookingDialog({
  token,
  baseUrl,
  open,
  onClose,
}: {
  token: string;
  baseUrl: string;
  open: boolean;
  onClose: () => void;
}) {
  const [step, setStep] = useState<Step>("slots");
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [heading, setHeading] = useState<{ title: string; description: string | null }>({
    title: "Book a demo",
    description: null,
  });
  /** Set when the project has a WhatsApp code — the second way in. */
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);
  const [selected, setSelected] = useState<Slot | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [code, setCode] = useState("");
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [meetUrl, setMeetUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const headers = useMemo(
    () => ({ Authorization: `Bearer ${token}`, "Content-Type": "application/json" }),
    [token]
  );

  const loadSlots = useCallback(async () => {
    setError(null);
    setSlots(null);
    try {
      const from = new Date().toISOString();
      const to = new Date(Date.now() + 21 * 86400_000).toISOString();
      const res = await fetch(
        `${baseUrl}/api/v1/sdk/booking/availability?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
        { headers }
      );
      const json = await res.json();
      if (!json.success) {
        setError(json.error ?? "Couldn't load available times");
        setSlots([]);
        return;
      }
      setSlots(json.data.slots ?? []);
      setHeading({ title: json.data.title, description: json.data.description });
      setWhatsappUrl(json.data.whatsappUrl ?? null);
    } catch {
      setError("Couldn't reach the booking service");
      setSlots([]);
    }
  }, [baseUrl, headers]);

  useEffect(() => {
    if (!open) return;
    // Reset every open: a dialog that reopens showing last week's chosen slot
    // and a half-filled form is worse than one that starts clean.
    setStep("slots");
    setSelected(null);
    setCode("");
    setBookingId(null);
    setError(null);
    void loadSlots();
  }, [open, loadSlots]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open, onClose]);

  if (!open) return null;

  const byDay = new Map<string, Slot[]>();
  for (const slot of slots ?? []) {
    const key = dayKey(slot.startsAt);
    byDay.set(key, [...(byDay.get(key) ?? []), slot]);
  }

  async function startBooking() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${baseUrl}/api/v1/sdk/booking`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name,
          email,
          phone,
          note,
          startsAt: selected.startsAt,
          timezone: localZone(),
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error ?? "Couldn't hold that slot");
        return;
      }
      setBookingId(json.data.bookingId);
      setStep("code");
    } catch {
      setError("Couldn't reach the booking service");
    } finally {
      setBusy(false);
    }
  }

  async function confirmBooking() {
    if (!bookingId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${baseUrl}/api/v1/sdk/booking/verify`, {
        method: "POST",
        headers,
        body: JSON.stringify({ bookingId, code }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error ?? "Couldn't confirm that code");
        return;
      }
      setMeetUrl(json.data.meetUrl);
      setStep("done");
    } catch {
      setError("Couldn't reach the booking service");
    } finally {
      setBusy(false);
    }
  }

  const canSubmitDetails = name.trim() && email.includes("@") && phone.replace(/\D/g, "").length >= 8;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483000,
        background: "rgba(0,0,0,.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={heading.title}
        style={{
          width: "min(440px, 100%)",
          maxHeight: "min(660px, 90vh)",
          display: "flex",
          flexDirection: "column",
          background: t.bg,
          color: t.text,
          borderRadius: 16,
          boxShadow: "0 20px 60px rgba(0,0,0,.55)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "16px 18px",
            borderBottom: `1px solid ${t.border}`,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{heading.title}</div>
            {heading.description && (
              <div style={{ fontSize: 12, color: t.muted, marginTop: 2 }}>{heading.description}</div>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ border: 0, background: "transparent", color: t.muted, fontSize: 20, cursor: "pointer", lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: 18, overflowY: "auto", flex: "1 1 auto" }}>
          {error && (
            <div style={{ color: t.danger, fontSize: 12, marginBottom: 12, lineHeight: 1.5 }}>{error}</div>
          )}

          {step === "slots" && (
            <>
              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "block",
                    marginBottom: 16,
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: `1px solid ${t.border}`,
                    background: t.surface,
                    color: t.text,
                    fontSize: 13,
                    textDecoration: "none",
                  }}
                >
                  💬 Rather book on WhatsApp?
                  <span style={{ display: "block", fontSize: 11, color: t.muted, marginTop: 2 }}>
                    We&apos;ll ask the same questions in chat.
                  </span>
                </a>
              )}
              {slots === null && <div style={{ color: t.muted, fontSize: 13 }}>Finding times…</div>}
              {slots?.length === 0 && !error && (
                <div style={{ color: t.muted, fontSize: 13 }}>No times available right now.</div>
              )}
              {[...byDay.entries()].map(([day, daySlots]) => (
                <div key={day} style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 11, color: t.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".6px" }}>
                    {formatDay(daySlots[0].startsAt)}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {daySlots.map((slot) => (
                      <button
                        key={slot.startsAt}
                        onClick={() => {
                          setSelected(slot);
                          setStep("details");
                        }}
                        style={{
                          padding: "8px 14px",
                          borderRadius: 999,
                          border: `1px solid ${t.border}`,
                          background: t.surface,
                          color: t.text,
                          fontSize: 13,
                          cursor: "pointer",
                        }}
                      >
                        {formatTime(slot.startsAt)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}

          {step === "details" && selected && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 13, color: t.muted }}>
                {formatDay(selected.startsAt)} · {formatTime(selected.startsAt)}
                {" · "}
                <button
                  onClick={() => setStep("slots")}
                  style={{ border: 0, background: "transparent", color: t.accent, cursor: "pointer", fontSize: 13, padding: 0 }}
                >
                  change
                </button>
              </div>
              <Field label="Your name" value={name} onChange={setName} />
              <Field label="Email" value={email} onChange={setEmail} type="email" />
              <Field
                label="WhatsApp number"
                value={phone}
                onChange={setPhone}
                type="tel"
                hint="We send a code here to confirm, then a reminder before the call."
              />
              <Field label="Anything we should know? (optional)" value={note} onChange={setNote} />
              <button
                onClick={startBooking}
                disabled={!canSubmitDetails || busy}
                style={primaryStyle(!canSubmitDetails || busy)}
              >
                {busy ? "Sending code…" : "Send code on WhatsApp"}
              </button>
            </div>
          )}

          {step === "code" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 13, color: t.muted, lineHeight: 1.5 }}>
                We sent a 6-digit code to your WhatsApp. Your slot is held for 10 minutes.
              </div>
              <Field label="Code" value={code} onChange={setCode} />
              <button
                onClick={confirmBooking}
                disabled={code.trim().length < 4 || busy}
                style={primaryStyle(code.trim().length < 4 || busy)}
              >
                {busy ? "Confirming…" : "Confirm booking"}
              </button>
            </div>
          )}

          {step === "done" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>You&apos;re booked.</div>
              <div style={{ fontSize: 13, color: t.muted, lineHeight: 1.6 }}>
                {selected && `${formatDay(selected.startsAt)} at ${formatTime(selected.startsAt)}. `}
                A calendar invite is on its way to {email}, and we&apos;ll send a WhatsApp reminder
                before the call.
              </div>
              {meetUrl && (
                <a href={meetUrl} target="_blank" rel="noreferrer" style={{ ...primaryStyle(false), textAlign: "center", textDecoration: "none" }}>
                  Open the meeting link
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function primaryStyle(disabled: boolean) {
  return {
    marginTop: 4,
    padding: "10px 16px",
    borderRadius: 999,
    border: 0,
    background: disabled ? "#2a2a2a" : t.accent,
    color: disabled ? "#6b7280" : "#fff",
    fontSize: 14,
    fontWeight: 500,
    cursor: disabled ? "default" : "pointer",
  } as const;
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  hint?: string;
}) {
  return (
    <label style={{ display: "block", fontSize: 11, color: t.muted }}>
      {label}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          display: "block",
          width: "100%",
          boxSizing: "border-box",
          marginTop: 4,
          padding: "9px 12px",
          background: t.surface,
          color: t.text,
          border: `1px solid ${t.border}`,
          borderRadius: 8,
          fontSize: 13,
          outline: "none",
        }}
      />
      {hint && <div style={{ marginTop: 4, fontSize: 10, color: t.muted }}>{hint}</div>}
    </label>
  );
}
