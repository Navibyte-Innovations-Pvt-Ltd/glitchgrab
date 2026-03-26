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
  PRO_PLATFORM: {
    name: "Glitchgrab Pro",
    amount: 19900, // ₹199
    currency: "INR" as const,
    description: "Unlimited repos, 100 issues/mo — AI-powered bug capture",
    razorpayPlanId: process.env.RAZORPAY_PLAN_PLATFORM ?? "",
  },
};

export type PlanKey = keyof typeof PLANS;
