export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getRazorpay } from "@/lib/razorpay";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    });

    if (!subscription) {
      return NextResponse.json(
        { success: false, error: "No subscription found" },
        { status: 400 }
      );
    }

    const razorpay = getRazorpay();

    // Cancel at end of current billing period (not immediately)
    await razorpay.subscriptions.cancel(
      subscription.razorpaySubscriptionId,
      true
    );

    // No DB update needed — getUserPlan() will fetch the cancelled status from Razorpay

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Cancel subscription error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to cancel subscription" },
      { status: 500 }
    );
  }
}
