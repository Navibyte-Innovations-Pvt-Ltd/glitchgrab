"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

declare global {
  interface Window {
    Razorpay: new (options: RazorpaySubscriptionOptions) => RazorpayInstance;
  }
}

interface RazorpaySubscriptionOptions {
  key: string;
  subscription_id: string;
  name: string;
  description: string;
  handler: (response: RazorpaySubscriptionResponse) => void;
  prefill: { name: string; email: string };
  theme: { color: string };
  modal?: { ondismiss?: () => void };
}

interface RazorpayInstance {
  open: () => void;
}

interface RazorpaySubscriptionResponse {
  razorpay_subscription_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export function UpgradeButton({
  plan,
  label,
  email,
  name,
  variant,
}: {
  plan: string;
  label: string;
  email: string;
  name: string;
  variant?: "default" | "link";
}) {
  const [loading, setLoading] = useState(false);

  async function handleUpgrade() {
    setLoading(true);

    try {
      const res = await fetch("/api/v1/billing/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();

      if (!data.success) {
        toast.error(data.error ?? "Failed to create subscription");
        setLoading(false);
        return;
      }

      if (!window.Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Failed to load Razorpay"));
          document.head.appendChild(script);
        });
      }

      const razorpay = new window.Razorpay({
        key: data.data.keyId,
        subscription_id: data.data.subscriptionId,
        name: "Glitchgrab",
        description: data.data.planName,
        handler: async (response: RazorpaySubscriptionResponse) => {
          try {
            const verifyRes = await fetch("/api/v1/billing/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(response),
            });
            const verifyData = await verifyRes.json();

            if (verifyData.success) {
              toast.success("Subscription activated! Refreshing...");
              window.location.reload();
            } else {
              toast.error("Payment verification failed");
            }
          } catch {
            toast.error("Payment verification failed");
          }
          setLoading(false);
        },
        prefill: { name, email },
        theme: { color: "#22d3ee" },
        modal: {
          ondismiss: () => setLoading(false),
        },
      });

      razorpay.open();
    } catch {
      toast.error("Something went wrong");
      setLoading(false);
    }
  }

  if (variant === "link") {
    return (
      <button
        onClick={handleUpgrade}
        disabled={loading}
        className="shrink-0 text-xs font-medium text-primary hover:underline disabled:opacity-50"
      >
        {loading ? "Processing..." : label}
      </button>
    );
  }

  return (
    <Button onClick={handleUpgrade} disabled={loading} className="w-full gap-2">
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {loading ? "Processing..." : label}
    </Button>
  );
}
