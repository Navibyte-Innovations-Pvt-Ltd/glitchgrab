"use client";

import { useState, useTransition } from "react";
import { MessageCircle, Send, ShieldCheck, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { sendOtp, verifyAndSavePhone } from "@/app/dashboard/settings/whatsapp-actions";

type Step = "idle" | "otp-sent" | "done";

export function PhonePromptDialog({ hasPhone }: { hasPhone: boolean }) {
  const [open, setOpen] = useState(!hasPhone);
  const [step, setStep] = useState<Step>("idle");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [pending, startTransition] = useTransition();

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
        setStep("done");
        toast.success("WhatsApp number verified");
        setTimeout(() => setOpen(false), 1200);
      } else {
        toast.error(res.error ?? "Verification failed");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent showCloseButton={false} className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-primary shrink-0" />
            <DialogTitle>Add WhatsApp for alerts</DialogTitle>
          </div>
          <DialogDescription>
            Get notified on WhatsApp when issues are assigned or resolved.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {step === "idle" && (
            <>
              <div className="flex items-center gap-2">
                <div className="flex-1 border border-border rounded bg-background/60 focus-within:border-primary/50 transition-colors">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="919876543210 — country code + number"
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
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-full font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors text-center py-1"
              >
                Skip for now — I'll set this in Settings
              </button>
            </>
          )}

          {step === "otp-sent" && (
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
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={pending}
                  className="font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
                >
                  Resend OTP
                </button>
                <span className="text-muted-foreground/30 text-[10px]">·</span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  Skip for now
                </button>
              </div>
            </div>
          )}

          {step === "done" && (
            <div className="flex items-center justify-center gap-2 py-3 font-mono text-sm text-emerald-400">
              <Check className="h-4 w-4" />
              Verified! You&apos;ll receive WhatsApp alerts.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
