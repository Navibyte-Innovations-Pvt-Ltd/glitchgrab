/**
 * Creates Razorpay subscription plans for Glitchgrab.
 *
 * Usage:
 *   bun run scripts/create-razorpay-plans.ts
 *
 * Reads RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET from .env
 * Works for both test (rzp_test_) and live (rzp_live_) keys.
 *
 * Output: Plan IDs to add to your .env as RAZORPAY_PLAN_BYOK and RAZORPAY_PLAN_PLATFORM
 */

import Razorpay from "razorpay";

// Env vars loaded by dotenvx — run via: bun run razorpay:create-plans

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

if (!keyId || !keySecret) {
  console.error("Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET in .env");
  process.exit(1);
}

const isTest = keyId.startsWith("rzp_test_");
console.info(`\nUsing ${isTest ? "TEST" : "LIVE"} Razorpay keys\n`);

const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

const currency = "INR";
const amount = 19900; // ₹199/month

console.info(`Currency: ${currency}${isTest ? " (test mode)" : ""}\n`);

const PLANS = [
  {
    envKey: "RAZORPAY_PLAN_PLATFORM",
    period: "monthly" as const,
    interval: 1,
    item: {
      name: "Glitchgrab Pro",
      amount,
      currency,
      description: "Unlimited repos, 100 issues/mo — AI-powered bug capture",
    },
  },
];

async function createPlans() {
  const results: { envKey: string; planId: string }[] = [];

  for (const plan of PLANS) {
    try {
      const created = await razorpay.plans.create({
        period: plan.period,
        interval: plan.interval,
        item: plan.item,
      });

      const symbol = currency === "INR" ? "₹" : "$";
      console.info(`Created: ${plan.item.name}`);
      console.info(`  Plan ID: ${created.id}`);
      console.info(`  Amount:  ${symbol}${plan.item.amount / 100}/month`);
      console.info();

      results.push({ envKey: plan.envKey, planId: created.id });
    } catch (err: unknown) {
      console.error(`\nFailed to create ${plan.item.name}:`);
      if (err && typeof err === "object" && "error" in err) {
        console.error(JSON.stringify((err as Record<string, unknown>).error, null, 2));
      } else {
        console.error(err instanceof Error ? err.message : JSON.stringify(err, null, 2));
      }
      process.exit(1);
    }
  }

  console.info("-------------------------------------------");
  console.info("Add these to your .env:\n");
  for (const r of results) {
    console.info(`${r.envKey}="${r.planId}"`);
  }
  console.info("\n-------------------------------------------");
}

createPlans();
