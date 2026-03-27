"use client";

import { useState } from "react";
import axios from "axios";
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
  image?: string;
  handler: (response: RazorpaySubscriptionResponse) => void;
  prefill: { name: string; email: string };
  theme: { color: string; backdrop_color?: string };
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
      const { data } = await axios.post("/api/v1/billing/subscribe", { plan });

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
        image: "/logo.png",
        handler: async (response: RazorpaySubscriptionResponse) => {
          try {
            const { data: verifyData } = await axios.post("/api/v1/billing/verify", response);

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
        theme: { color: "#22d3ee", backdrop_color: "#09090b" },
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
      <Button
        variant="link"
        onClick={handleUpgrade}
        disabled={loading}
        className="shrink-0 text-xs font-medium h-auto p-0"
      >
        {loading ? "Processing..." : label}
      </Button>
    );
  }

  return (
    <Button onClick={handleUpgrade} disabled={loading} className="w-full gap-2">
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {loading ? "Processing..." : label}
    </Button>
  );
}
