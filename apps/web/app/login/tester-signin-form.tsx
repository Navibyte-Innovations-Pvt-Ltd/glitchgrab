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
import { Loader2, MessageCircle, ArrowLeft, Smartphone } from "lucide-react";

/**
 * Tester sign-in: phone → 6-digit code → /dashboard.
 *
 * Testers are not GitHub users and never will be — they are QA people the repo
 * owner invited by phone number. The code goes out over SMS by default and
 * falls back to WhatsApp when the Msg91 DLT template isn't live yet; the API
 * reports which channel actually carried it so this copy never lies about where
 * to look.
 */
export function TesterSignInForm() {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState<string | undefined>("");
  const [otp, setOtp] = useState("");
  const [channel, setChannel] = useState<"sms" | "whatsapp">("sms");

  const sendMutation = useMutation({
    mutationFn: async (via: "sms" | "whatsapp") => {
      const { data } = await axios.post("/api/v1/qa/otp/send", { phone, channel: via });
      return data as { data?: { channel?: "sms" | "whatsapp" } };
    },
    onSuccess: (data) => {
      const used = data?.data?.channel ?? "sms";
      setChannel(used);
      toast.success(used === "sms" ? "Code sent by SMS" : "Code sent on WhatsApp");
      setStep("otp");
    },
    onError: (err) => {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : "Failed to send code";
      toast.error(msg ?? "Failed to send code");
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async () => axios.post("/api/v1/qa/otp/verify", { phone, otp }),
    onSuccess: () => {
      toast.success("Signed in");
      router.replace("/dashboard");
      router.refresh();
    },
    onError: (err) => {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : "Invalid code";
      toast.error(msg ?? "Invalid code");
    },
  });

  if (step === "otp") {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          verifyMutation.mutate();
        }}
        className="space-y-4"
      >
        <div className="space-y-2">
          <Label htmlFor="tester-otp" className="text-xs text-muted-foreground">
            6-digit code sent {channel === "sms" ? "by SMS" : "on WhatsApp"} to {phone}
          </Label>
          <Input
            id="tester-otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            placeholder="123456"
            autoFocus
            className="text-center text-lg tracking-[0.4em]"
          />
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={verifyMutation.isPending || otp.length !== 6}>
          {verifyMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Verify and continue
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="w-full"
          onClick={() => {
            setStep("phone");
            setOtp("");
          }}
          disabled={verifyMutation.isPending}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Use a different number
        </Button>
      </form>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        sendMutation.mutate("sms");
      }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="tester-phone" className="text-xs text-muted-foreground">
          The number your admin invited you on
        </Label>
        <PhoneInput id="tester-phone" value={phone} onChange={setPhone} defaultCountry="IN" />
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={sendMutation.isPending || !phone}>
        {sendMutation.isPending && sendMutation.variables === "sms" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Smartphone className="h-4 w-4" />
        )}
        Send code by SMS
      </Button>

      <Button
        type="button"
        size="lg"
        variant="outline"
        className="w-full"
        onClick={() => sendMutation.mutate("whatsapp")}
        disabled={sendMutation.isPending || !phone}
      >
        {sendMutation.isPending && sendMutation.variables === "whatsapp" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <MessageCircle className="h-4 w-4" />
        )}
        Send code on WhatsApp
      </Button>

      <p className="text-center text-[10px] leading-relaxed text-muted-foreground/60">
        No code? Message our WhatsApp number with{" "}
        <span className="font-mono text-muted-foreground">hi</span>{" "}
        and we&apos;ll send you a one-tap sign-in link.
      </p>
    </form>
  );
}
