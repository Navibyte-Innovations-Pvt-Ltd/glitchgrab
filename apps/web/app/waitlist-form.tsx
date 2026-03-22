"use client";

import { useState } from "react";

const PRICE_OPTIONS = [
  { value: "too_low", label: "Too cheap — I'd question quality" },
  { value: "fair", label: "Fair price" },
  { value: "bit_high", label: "A bit expensive" },
  { value: "too_high", label: "Too expensive" },
];

const FEATURE_OPTIONS = [
  { value: "handwritten", label: "Handwritten notes → issue" },
  { value: "sdk_auto", label: "SDK auto-capture" },
  { value: "report_button", label: "Report Error button" },
  { value: "screenshot", label: "Screenshot upload → issue" },
  { value: "mcp", label: "MCP server (Claude integration)" },
  { value: "dedup", label: "AI deduplication" },
];

const TOOL_OPTIONS = [
  { value: "nothing", label: "Nothing — I just deal with it" },
  { value: "sentry", label: "Sentry" },
  { value: "jam", label: "Jam.dev" },
  { value: "marker", label: "Marker.io" },
  { value: "manual", label: "Manually create GitHub issues" },
  { value: "other", label: "Other" },
];

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "survey" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [surveyLoading, setSurveyLoading] = useState(false);

  const [priceFeel, setPriceFeel] = useState("");
  const [topFeature, setTopFeature] = useState("");
  const [currentTool, setCurrentTool] = useState("");
  const [suggestion, setSuggestion] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (data.success) {
        setStatus("survey");
      } else {
        setStatus("error");
        setErrorMsg(data.error || "Something went wrong");
      }
    } catch {
      setStatus("error");
      setErrorMsg("Network error. Try again.");
    }
  }

  async function handleSurvey() {
    setSurveyLoading(true);
    try {
      await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          priceFeel: priceFeel || null,
          topFeature: topFeature || null,
          currentTool: currentTool || null,
          suggestion: suggestion.trim() || null,
        }),
      });
    } catch {
      // Survey save failed — not critical
    }
    setSurveyLoading(false);
    setStatus("done");
  }

  if (status === "done") {
    return (
      <div className="mt-8 rounded-xl border border-green/30 bg-green/5 p-6">
        <p className="text-green font-semibold text-lg">Thanks for the feedback!</p>
        <p className="text-text-muted text-sm mt-1">
          We&apos;ll email you when Glitchgrab is ready. Your input shapes what we build first.
        </p>
      </div>
    );
  }

  if (status === "survey") {
    return (
      <div className="mt-8 text-left max-w-md mx-auto space-y-6">
        <div className="rounded-xl border border-green/30 bg-green/5 p-4 text-center">
          <p className="text-green font-semibold">You&apos;re in! Quick 3 questions?</p>
          <p className="text-text-dim text-xs mt-1">Optional — helps us build what you actually need</p>
        </div>

        {/* Q1: Pricing */}
        <div>
          <p className="text-sm font-medium mb-2">At $20/mo for unlimited repos & issues, what do you think?</p>
          <div className="grid grid-cols-2 gap-2">
            {PRICE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPriceFeel(opt.value)}
                className={`rounded-lg border px-3 py-2 text-xs text-left transition ${
                  priceFeel === opt.value
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border bg-bg text-text-muted hover:border-border-bright"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Q2: Top feature */}
        <div>
          <p className="text-sm font-medium mb-2">Which feature excites you most?</p>
          <div className="grid grid-cols-2 gap-2">
            {FEATURE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTopFeature(opt.value)}
                className={`rounded-lg border px-3 py-2 text-xs text-left transition ${
                  topFeature === opt.value
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border bg-bg text-text-muted hover:border-border-bright"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Q3: Current tool */}
        <div>
          <p className="text-sm font-medium mb-2">What do you use today for bug tracking?</p>
          <div className="grid grid-cols-2 gap-2">
            {TOOL_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setCurrentTool(opt.value)}
                className={`rounded-lg border px-3 py-2 text-xs text-left transition ${
                  currentTool === opt.value
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border bg-bg text-text-muted hover:border-border-bright"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Suggestion box */}
        <div>
          <p className="text-sm font-medium mb-2">Anything else you&apos;d like to tell us?</p>
          <textarea
            value={suggestion}
            onChange={(e) => setSuggestion(e.target.value)}
            placeholder="Feature ideas, pain points, what would make you pay instantly..."
            rows={3}
            maxLength={500}
            className="w-full rounded-xl border border-border bg-bg px-4 py-3 text-sm text-text placeholder:text-text-dim outline-none focus:border-accent transition resize-none"
          />
          <p className="text-xs text-text-dim text-right mt-1">{suggestion.length}/500</p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleSurvey}
            disabled={surveyLoading}
            className="flex-1 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-bg transition hover:bg-accent-hover disabled:opacity-50"
          >
            {surveyLoading ? "Saving..." : "Submit Feedback"}
          </button>
          <button
            type="button"
            onClick={() => setStatus("done")}
            className="rounded-xl border border-border px-4 py-3 text-sm text-text-muted hover:border-border-bright transition"
          >
            Skip
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-3 sm:flex-row sm:gap-2 max-w-md mx-auto">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        required
        className="flex-1 rounded-xl border border-border bg-bg px-4 py-3 text-sm text-text placeholder:text-text-dim outline-none focus:border-accent transition"
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-bg transition hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
      >
        {status === "loading" ? "Joining..." : "Join Waitlist"}
      </button>
      {status === "error" && (
        <p className="text-red text-xs sm:absolute sm:mt-14">{errorMsg}</p>
      )}
    </form>
  );
}
