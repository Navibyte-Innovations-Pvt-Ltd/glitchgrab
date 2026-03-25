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

const isTestMode = (process.env.RAZORPAY_KEY_ID ?? "").startsWith("rzp_test_");

export const PLANS = {
  PRO_BYOK: {
    name: "Pro (BYOK)",
    amount: isTestMode ? 41500 : 500, // ₹415 (test) or $5 (live)
    currency: isTestMode ? "INR" : "USD",
    description: "Unlimited repos & issues — bring your own AI key",
    razorpayPlanId: process.env.RAZORPAY_PLAN_BYOK ?? "",
  },
  PRO_PLATFORM: {
    name: "Pro (Platform AI)",
    amount: isTestMode ? 83000 : 1000, // ₹830 (test) or $10 (live)
    currency: isTestMode ? "INR" : "USD",
    description: "Unlimited repos, 100 issues/mo — we provide AI",
    razorpayPlanId: process.env.RAZORPAY_PLAN_PLATFORM ?? "",
  },
};

export type PlanKey = keyof typeof PLANS;
