"use client";

import { useState, useTransition } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MessageCircle, Send, ShieldCheck, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import InputPhone from "@/components/AppInputFields/components/InputPhone";
import InputOTPController from "@/components/AppInputFields/components/InputOTP";
import { sendOtp, verifyAndSavePhone } from "@/app/dashboard/settings/whatsapp-actions";

const phoneSchema = z.object({
  phone: z.string().min(1, "Phone number required"),
});

const otpSchema = z.object({
  otp: z.string().length(4, "Enter the 4-digit OTP"),
});

type PhoneForm = z.infer<typeof phoneSchema>;
type OtpForm = z.infer<typeof otpSchema>;
type Step = "phone" | "otp" | "done";

export function PhonePromptDialog({ hasPhone }: { hasPhone: boolean }) {
  const [open, setOpen] = useState(!hasPhone);
  const [step, setStep] = useState<Step>("phone");
  const [submittedPhone, setSubmittedPhone] = useState("");
  const [pending, startTransition] = useTransition();

  const phoneForm = useForm<PhoneForm>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: "" },
  });

  const otpForm = useForm<OtpForm>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" },
  });

  function onPhoneSubmit(values: PhoneForm) {
    startTransition(async () => {
      const res = await sendOtp(values.phone);
      if (res.ok) {
        setSubmittedPhone(values.phone);
        setStep("otp");
        toast.success("OTP sent to your WhatsApp");
      } else {
        phoneForm.setError("phone", { message: res.error ?? "Failed to send OTP" });
      }
    });
  }

  function onOtpSubmit(values: OtpForm) {
    startTransition(async () => {
      const res = await verifyAndSavePhone(submittedPhone, values.otp);
      if (res.ok) {
        setStep("done");
        toast.success("WhatsApp number verified");
        setTimeout(() => setOpen(false), 1200);
      } else {
        otpForm.setError("otp", { message: res.error ?? "Verification failed" });
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

        {step === "phone" && (
          <FormProvider {...phoneForm}>
            <form onSubmit={phoneForm.handleSubmit(onPhoneSubmit)} className="space-y-4">
              <InputPhone
                type="phone"
                name="phone"
                label="WhatsApp number"
                placeholder="Enter phone number"
                required
              />
              <button
                type="submit"
                disabled={pending}
                className="w-full font-mono text-[10px] uppercase tracking-widest text-primary border border-primary/40 bg-primary/5 hover:bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2 rounded inline-flex items-center justify-center gap-1.5 transition-colors"
              >
                {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                {pending ? "Sending..." : "Send OTP"}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-full font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors text-center py-1"
              >
                Skip for now — I&apos;ll set this in Settings
              </button>
            </form>
          </FormProvider>
        )}

        {step === "otp" && (
          <FormProvider {...otpForm}>
            <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-4">
              <p className="font-mono text-[10px] text-muted-foreground">
                OTP sent to <span className="text-foreground">+{submittedPhone.replace(/\D/g, "")}</span>. Check WhatsApp.
              </p>
              <InputOTPController
                type="OTP"
                name="otp"
                label="Enter OTP"
                required
                onComplete={(val) => {
                  otpForm.setValue("otp", val);
                  otpForm.handleSubmit(onOtpSubmit)();
                }}
              />
              <button
                type="submit"
                disabled={pending}
                className="w-full font-mono text-[10px] uppercase tracking-widest text-primary border border-primary/40 bg-primary/5 hover:bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2 rounded inline-flex items-center justify-center gap-1.5 transition-colors"
              >
                {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3" />}
                {pending ? "Verifying..." : "Verify"}
              </button>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => phoneForm.handleSubmit(onPhoneSubmit)()}
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
            </form>
          </FormProvider>
        )}

        {step === "done" && (
          <div className="flex items-center justify-center gap-2 py-3 font-mono text-sm text-emerald-400">
            <Check className="h-4 w-4" />
            Verified! You&apos;ll receive WhatsApp alerts.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
