export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { validateWebhookSignature } from "razorpay/dist/utils/razorpay-utils";

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get("x-razorpay-signature");

    if (!signature || !process.env.RAZORPAY_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    const isValid = validateWebhookSignature(
      body,
      signature,
      process.env.RAZORPAY_WEBHOOK_SECRET
    );

    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(body) as { event: string };

    // Log webhook events for debugging — no DB updates needed.
    // Razorpay is the single source of truth for subscription status.
    // getUserPlan() fetches live status from Razorpay API on every call.
    console.info("[Webhook ]", event.event);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}
