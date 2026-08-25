"use client";

import { useState, useTransition, useEffect } from "react";
import { MessageCircle, Loader2, Check, X, Send, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  getWhatsappPhone,
  sendOtp,
  verifyAndSavePhone,
  removeWhatsappPhone,
} from "./whatsapp-actions";

type Step = "idle" | "otp-sent" | "verified";

export function WhatsappSettingsForm() {
  const [savedPhone, setSavedPhone] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    getWhatsappPhone().then((p) => {
      setSavedPhone(p);
      setLoading(false);
    });
  }, []);

  function handleSendOtp() {
    startTransition(async () => {
      const res = await sendOtp(phone);
      if (res.ok) {
        setStep("otp-sent");
        toast.success("OTP sent to your WhatsApp");
      } else {
        toast.error(res.error ?? "Failed to send OTP");
      }
    });
  }

  function handleVerify() {
    startTransition(async () => {
      const res = await verifyAndSavePhone(phone, otp);
      if (res.ok) {
        setStep("verified");
        setSavedPhone(phone.replace(/\D/g, ""));
        toast.success("WhatsApp number verified and saved");
      } else {
        toast.error(res.error ?? "Verification failed");
      }
    });
  }

  function handleRemove() {
    startTransition(async () => {
      await removeWhatsappPhone();
      setSavedPhone(null);
      setPhone("");
      setOtp("");
      setStep("idle");
      toast.success("WhatsApp number removed");
    });
  }

  function reset() {
    setStep("idle");
    setOtp("");
  }

  return (
    <section className="rounded border border-border bg-card">
      <header className="flex items-center justify-between px-5 py-3 border-b border-border">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
          <MessageCircle className="h-3 w-3" />
          WHATSAPP NOTIFICATIONS
        </h2>
        {savedPhone && (
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-emerald-400 border border-emerald-500/30 bg-emerald-500/5 px-2 py-1 rounded">
            <Check className="h-3 w-3" />
            Verified
          </span>
        )}
      </header>

      <div className="p-5 space-y-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">Your WhatsApp number</p>
          <p className="font-mono text-[10px] text-muted-foreground">
            Used to receive issue assignment alerts and &quot;not resolved&quot; escalations. Verified via OTP.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            loading...
          </div>
        ) : savedPhone ? (
          /* Already verified — show number + remove */
          <div className="flex items-center gap-3 rounded border border-border bg-background/40 p-3">
            <span className="flex-1 font-mono text-sm text-foreground">+{savedPhone}</span>
            <button
              type="button"
              onClick={handleRemove}
              disabled={pending}
              className="font-mono text-[10px] uppercase tracking-widest text-destructive border border-destructive/30 bg-destructive/5 hover:bg-destructive/10 disabled:opacity-50 px-3 py-1.5 rounded inline-flex items-center gap-1.5 transition-colors"
            >
              {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
              Remove
            </button>
            <button
              type="button"
              onClick={() => { setSavedPhone(null); setPhone(""); setStep("idle"); }}
              className="font-mono text-[10px] uppercase tracking-widest text-primary border border-primary/40 bg-primary/5 hover:bg-primary/10 px-3 py-1.5 rounded transition-colors"
            >
              Change
            </button>
          </div>
        ) : step === "idle" ? (
          /* Step 1: Enter phone */
          <div className="flex items-center gap-2">
            <div className="flex-1 border border-border rounded bg-background/60 focus-within:border-primary/50 transition-colors">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="919876543210 — country code + number, no spaces"
                className="w-full bg-transparent px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={pending || !phone.trim()}
              className="font-mono text-[10px] uppercase tracking-widest text-primary border border-primary/40 bg-primary/5 hover:bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2 rounded inline-flex items-center gap-1.5 transition-colors shrink-0"
            >
              {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
              {pending ? "Sending..." : "Send OTP"}
            </button>
          </div>
        ) : step === "otp-sent" ? (
          /* Step 2: Enter OTP */
          <div className="space-y-3">
            <p className="font-mono text-[10px] text-muted-foreground">
              OTP sent to <span className="text-foreground">+{phone.replace(/\D/g, "")}</span>. Check WhatsApp.
            </p>
            <div className="flex items-center gap-2">
              <div className="border border-border rounded bg-background/60 focus-within:border-primary/50 transition-colors w-40">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="6-digit OTP"
                  className="w-full bg-transparent px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none tracking-[0.3em]"
                />
              </div>
              <button
                type="button"
                onClick={handleVerify}
                disabled={pending || otp.length < 6}
                className="font-mono text-[10px] uppercase tracking-widest text-primary border border-primary/40 bg-primary/5 hover:bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2 rounded inline-flex items-center gap-1.5 transition-colors shrink-0"
              >
                {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3" />}
                {pending ? "Verifying..." : "Verify"}
              </button>
              <button
                type="button"
                onClick={reset}
                className="font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              >
                ← back
              </button>
            </div>
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={pending}
              className="font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
            >
              Resend OTP
            </button>
          </div>
        ) : null}

        {/* Template reference */}
        <div className="rounded border border-border bg-background/40 p-3 space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            3 templates required in Meta Business Manager
          </p>
          <div className="space-y-2 text-[10px] font-mono text-muted-foreground/80">
            <div className="space-y-0.5">
              <p className="text-foreground/70">wa_otp (Authentication/Utility)</p>
              <p>Body: Your Glitchgrab verification code is {"*{{1}}*"}. Valid for 10 minutes.</p>
            </div>
            <div className="space-y-0.5 border-t border-border pt-2">
              <p className="text-foreground/70">issue_resolved (Utility)</p>
              <p>Body: Hi {"{{1}}"}, your issue {"{{2}}"} has been resolved! Was the fix helpful?</p>
              <p>Button 0 URL: Contact Developer → https://wa.me/{"{{1}}"}</p>
              <p>Button 1 quick_reply: ✅ Yes, fixed!</p>
              <p>Button 2 quick_reply: ❌ No, reopen</p>
            </div>
            <div className="space-y-0.5 border-t border-border pt-2">
              <p className="text-foreground/70">issue_assigned_dev (Utility)</p>
              <p>Body: 👋 {"{{1}}"}, issue {"{{2}}"} has been assigned to you.</p>
              <p>Button 0 URL: View Issue → https://github.com/{"{{1}}"}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
