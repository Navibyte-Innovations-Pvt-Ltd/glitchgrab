export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
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

    const event = JSON.parse(body) as {
      event: string;
      payload: {
        payment?: {
          entity: {
            id: string;
            status: string;
            notes?: { userId?: string; plan?: string };
          };
        };
        subscription?: {
          entity: {
            id: string;
            status: string;
            notes?: { userId?: string };
          };
        };
      };
    };

    const eventType = event.event;

    if (eventType === "payment.captured") {
      // Payment successful — already handled in verify route
      // This is a backup confirmation
      const payment = event.payload.payment?.entity;
      const userId = payment?.notes?.userId;

      if (userId) {
        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setMonth(periodEnd.getMonth() + 1);

        await prisma.subscription.upsert({
          where: { userId },
          update: {
            plan: "PRO_BYOK",
            status: "ACTIVE",
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
          },
          create: {
            userId,
            plan: "PRO_BYOK",
            status: "ACTIVE",
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
          },
        });
      }
    }

    if (eventType === "payment.failed") {
      const payment = event.payload.payment?.entity;
      const userId = payment?.notes?.userId;

      if (userId) {
        await prisma.subscription.upsert({
          where: { userId },
          update: { status: "PAST_DUE" },
          create: {
            userId,
            plan: "FREE",
            status: "PAST_DUE",
          },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}
