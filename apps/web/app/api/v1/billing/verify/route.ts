export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { validatePaymentVerification } from "razorpay/dist/utils/razorpay-utils";

interface VerifyBody {
  razorpay_subscription_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = (await request.json()) as VerifyBody;

    // Razorpay subscription verification uses subscription_id + payment_id
    const isValid = validatePaymentVerification(
      {
        subscription_id: body.razorpay_subscription_id,
        payment_id: body.razorpay_payment_id,
      },
      body.razorpay_signature,
      process.env.RAZORPAY_KEY_SECRET ?? ""
    );

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Payment verification failed" },
        { status: 400 }
      );
    }

    // Verify user exists in DB
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found. Please sign out and sign in again." },
        { status: 400 }
      );
    }

    // Just store the Razorpay subscription ID — status comes from Razorpay API directly
    await prisma.subscription.upsert({
      where: { userId: session.user.id },
      update: {
        razorpaySubscriptionId: body.razorpay_subscription_id,
      },
      create: {
        userId: session.user.id,
        razorpaySubscriptionId: body.razorpay_subscription_id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Verify error:", error);
    return NextResponse.json(
      { success: false, error: "Verification failed" },
      { status: 500 }
    );
  }
}
