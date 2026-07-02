"use client";

import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { FlaskConical, Loader2, ArrowLeft } from "lucide-react";

export function QaLogin() {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState<string | undefined>("");
  const [otp, setOtp] = useState("");

  const sendMutation = useMutation({
    mutationFn: async () => axios.post("/api/v1/qa/otp/send", { phone }),
    onSuccess: () => {
      toast.success("OTP sent to your WhatsApp");
      setStep("otp");
    },
    onError: (err) => {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : "Failed to send OTP";
      toast.error(msg ?? "Failed to send OTP");
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async () => axios.post("/api/v1/qa/otp/verify", { phone, otp }),
    onSuccess: () => {
      toast.success("Signed in");
      router.refresh();
    },
    onError: (err) => {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : "Invalid OTP";
      toast.error(msg ?? "Invalid OTP");
    },
  });

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-6">
          <FlaskConical className="h-6 w-6 text-primary" />
          <span className="text-lg font-semibold">Tester sign in</span>
        </div>

        {step === "phone" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMutation.mutate();
            }}
            className="space-y-4"
          >
            <p className="text-sm text-muted-foreground">
              Enter your WhatsApp number. We&apos;ll send you a one-time code to sign in.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="qa-phone">WhatsApp number</Label>
              <PhoneInput id="qa-phone" value={phone} onChange={setPhone} />
            </div>
            <Button type="submit" className="w-full" disabled={sendMutation.isPending || !phone}>
              {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Send code
            </Button>
          </form>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              verifyMutation.mutate();
            }}
            className="space-y-4"
          >
            <button
              type="button"
              onClick={() => setStep("phone")}
              className="text-xs text-muted-foreground inline-flex items-center gap-1 hover:text-foreground"
            >
              <ArrowLeft className="h-3 w-3" /> Change number
            </button>
            <div className="space-y-1.5">
              <Label htmlFor="qa-otp">Enter the 6-digit code</Label>
              <Input
                id="qa-otp"
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                className="tracking-[0.4em] text-center text-lg"
              />
            </div>
            <Button type="submit" className="w-full" disabled={verifyMutation.isPending || otp.length < 6}>
              {verifyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Verify &amp; sign in
            </Button>
            <button
              type="button"
              onClick={() => sendMutation.mutate()}
              disabled={sendMutation.isPending}
              className="w-full text-xs text-muted-foreground hover:text-foreground"
            >
              Resend code
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
