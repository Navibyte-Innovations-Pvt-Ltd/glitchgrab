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
            plan_id: string;
            current_start: number | null;
            current_end: number | null;
            notes?: { userId?: string; plan?: string };
          };
        };
      };
    };

    const eventType = event.event;
    console.info("[Webhook]", eventType);

    // ─── Subscription Events (recurring billing) ─────────────

    if (eventType === "subscription.activated") {
      // First payment successful — subscription is now active
      const sub = event.payload.subscription?.entity;
      const userId = sub?.notes?.userId;
      const plan = "PRO_PLATFORM" as const;

      if (userId && sub) {
        await prisma.subscription.upsert({
          where: { userId },
          update: {
            plan,
            status: "ACTIVE",
            razorpaySubscriptionId: sub.id,
            currentPeriodStart: sub.current_start ? new Date(sub.current_start * 1000) : new Date(),
            currentPeriodEnd: sub.current_end ? new Date(sub.current_end * 1000) : null,
          },
          create: {
            userId,
            plan,
            status: "ACTIVE",
            razorpaySubscriptionId: sub.id,
            currentPeriodStart: sub.current_start ? new Date(sub.current_start * 1000) : new Date(),
            currentPeriodEnd: sub.current_end ? new Date(sub.current_end * 1000) : null,
          },
        });
      }
    }

    if (eventType === "subscription.charged") {
      // Recurring payment successful — extend the billing period
      const sub = event.payload.subscription?.entity;
      if (sub?.id) {
        await prisma.subscription.updateMany({
          where: { razorpaySubscriptionId: sub.id },
          data: {
            status: "ACTIVE",
            currentPeriodStart: sub.current_start ? new Date(sub.current_start * 1000) : new Date(),
            currentPeriodEnd: sub.current_end ? new Date(sub.current_end * 1000) : null,
          },
        });
      }
    }

    if (eventType === "subscription.pending") {
      // Payment retry pending
      const sub = event.payload.subscription?.entity;
      if (sub?.id) {
        await prisma.subscription.updateMany({
          where: { razorpaySubscriptionId: sub.id },
          data: { status: "PAST_DUE" },
        });
      }
    }

    if (eventType === "subscription.halted") {
      // All payment retries failed — subscription halted
      const sub = event.payload.subscription?.entity;
      if (sub?.id) {
        await prisma.subscription.updateMany({
          where: { razorpaySubscriptionId: sub.id },
          data: { status: "EXPIRED" },
        });
      }
    }

    if (eventType === "subscription.cancelled") {
      // User or admin cancelled
      const sub = event.payload.subscription?.entity;
      if (sub?.id) {
        await prisma.subscription.updateMany({
          where: { razorpaySubscriptionId: sub.id },
          data: {
            status: "CANCELLED",
            cancelledAt: new Date(),
          },
        });
      }
    }

    // ─── Payment Events (backup) ─────────────────────────────

    if (eventType === "payment.captured") {
      // Backup confirmation — subscription.activated is primary
      const payment = event.payload.payment?.entity;
      const userId = payment?.notes?.userId;
      const plan = payment?.notes?.plan === "PRO_PLATFORM" ? "PRO_PLATFORM" : "PRO_BYOK";

      if (userId) {
        const existing = await prisma.subscription.findUnique({
          where: { userId },
        });
        // Only upsert if not already active (avoid overwriting subscription data)
        if (!existing || existing.status !== "ACTIVE") {
          const now = new Date();
          const periodEnd = new Date(now);
          periodEnd.setMonth(periodEnd.getMonth() + 1);

          await prisma.subscription.upsert({
            where: { userId },
            update: { plan, status: "ACTIVE", currentPeriodStart: now, currentPeriodEnd: periodEnd },
            create: { userId, plan, status: "ACTIVE", currentPeriodStart: now, currentPeriodEnd: periodEnd },
          });
        }
      }
    }

    if (eventType === "payment.failed") {
      const payment = event.payload.payment?.entity;
      const userId = payment?.notes?.userId;

      if (userId) {
        await prisma.subscription.updateMany({
          where: { userId, status: "ACTIVE" },
          data: { status: "PAST_DUE" },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}
