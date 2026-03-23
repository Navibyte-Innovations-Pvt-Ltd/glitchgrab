import Razorpay from "razorpay";

export function getRazorpay() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("Razorpay keys not configured");
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

export const PLANS = {
  PRO_BYOK: {
    name: "Pro (BYOK)",
    amount: 500, // $5 in cents
    currency: "USD",
    description: "Unlimited repos & issues — bring your own AI key",
  },
  PRO_PLATFORM: {
    name: "Pro (Platform AI)",
    amount: 1000, // $10 in cents
    currency: "USD",
    description: "Unlimited repos, 100 issues/mo — we provide AI",
  },
} as const;

export type PlanKey = keyof typeof PLANS;
