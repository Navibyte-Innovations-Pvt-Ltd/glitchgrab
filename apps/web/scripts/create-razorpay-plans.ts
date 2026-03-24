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
import { config } from "dotenv";

config(); // Load .env

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

if (!keyId || !keySecret) {
  console.error("Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET in .env");
  process.exit(1);
}

const isTest = keyId.startsWith("rzp_test_");
console.log(`\nUsing ${isTest ? "TEST" : "LIVE"} Razorpay keys\n`);

const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

const PLANS = [
  {
    envKey: "RAZORPAY_PLAN_BYOK",
    period: "monthly" as const,
    interval: 1,
    item: {
      name: "Glitchgrab Pro (BYOK)",
      amount: 500, // $5.00 in cents (Razorpay uses smallest currency unit)
      currency: "USD",
      description: "Unlimited repos & issues — bring your own AI key",
    },
  },
  {
    envKey: "RAZORPAY_PLAN_PLATFORM",
    period: "monthly" as const,
    interval: 1,
    item: {
      name: "Glitchgrab Pro (Platform AI)",
      amount: 1000, // $10.00 in cents
      currency: "USD",
      description: "Unlimited repos, 100 issues/mo — we provide AI",
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

      console.log(`Created: ${plan.item.name}`);
      console.log(`  Plan ID: ${created.id}`);
      console.log(`  Amount:  $${plan.item.amount / 100}/month`);
      console.log();

      results.push({ envKey: plan.envKey, planId: created.id });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Failed to create ${plan.item.name}: ${message}`);
      process.exit(1);
    }
  }

  console.log("-------------------------------------------");
  console.log("Add these to your .env:\n");
  for (const r of results) {
    console.log(`${r.envKey}="${r.planId}"`);
  }
  console.log("\n-------------------------------------------");
}

createPlans();
