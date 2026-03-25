export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getRazorpay, PLANS, type PlanKey } from "@/lib/razorpay";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = (await request.json()) as { plan: string };
    const planKey = body.plan as PlanKey;

    if (!PLANS[planKey]) {
      return NextResponse.json(
        { success: false, error: "Invalid plan" },
        { status: 400 }
      );
    }

    // Check if already subscribed
    const existing = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    });

    if (existing?.status === "ACTIVE" && existing.plan !== "FREE") {
      return NextResponse.json(
        { success: false, error: "Already on a paid plan" },
        { status: 400 }
      );
    }

    const plan = PLANS[planKey];
    const razorpay = getRazorpay();

    if (!plan.razorpayPlanId) {
      return NextResponse.json(
        { success: false, error: "Razorpay plan not configured. Run: bun run scripts/create-razorpay-plans.ts" },
        { status: 500 }
      );
    }

    // Create a Razorpay Subscription (recurring monthly)
    const subscription = await razorpay.subscriptions.create({
      plan_id: plan.razorpayPlanId,
      total_count: 12, // Max 12 billing cycles (1 year), user can renew
      quantity: 1,
      notes: {
        userId: session.user.id,
        plan: planKey,
        email: session.user.email ?? "",
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        subscriptionId: subscription.id,
        amount: plan.amount,
        currency: plan.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
        planName: plan.name,
      },
    });
  } catch (error) {
    console.error("Subscribe error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create subscription" },
      { status: 500 }
    );
  }
}
