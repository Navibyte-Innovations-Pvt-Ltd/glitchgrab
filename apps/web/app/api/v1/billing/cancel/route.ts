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

    if (!subscription || subscription.status !== "ACTIVE") {
      return NextResponse.json(
        { success: false, error: "No active subscription to cancel" },
        { status: 400 }
      );
    }

    if (!subscription.razorpaySubscriptionId) {
      return NextResponse.json(
        { success: false, error: "Missing subscription ID" },
        { status: 400 }
      );
    }

    const razorpay = getRazorpay();

    // Cancel at end of current billing period (not immediately)
    await razorpay.subscriptions.cancel(
      subscription.razorpaySubscriptionId,
      true
    );

    // Mark as cancelled in our DB — access continues until period ends
    await prisma.subscription.update({
      where: { userId: session.user.id },
      data: {
        cancelledAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Cancel subscription error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to cancel subscription" },
      { status: 500 }
    );
  }
}
