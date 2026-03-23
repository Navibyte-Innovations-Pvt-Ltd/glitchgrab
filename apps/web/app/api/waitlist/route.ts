export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendWelcomeEmail, notifyNewSignup, notifySurveyResponse } from "@/lib/mail";

export async function POST(request: Request) {
  try {
    const { email, priceFeel, topFeature, currentTool, suggestion } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: "Invalid email address" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // If survey data, update existing entry and notify
    if (priceFeel || topFeature || currentTool || suggestion) {
      await prisma.waitlist.update({
        where: { email: normalizedEmail },
        data: {
          priceFeel: priceFeel || undefined,
          topFeature: topFeature || undefined,
          currentTool: currentTool || undefined,
          suggestion: suggestion || undefined,
        },
      });

      // Send survey notification (non-blocking)
      notifySurveyResponse(normalizedEmail, { priceFeel, topFeature, currentTool, suggestion }).catch(
        (err) => console.error("Survey email failed:", err)
      );

      return NextResponse.json({ success: true });
    }

    // Create new entry
    await prisma.waitlist.create({
      data: { email: normalizedEmail },
    });

    // Send emails (non-blocking — don't let email failures break the signup)
    sendWelcomeEmail(normalizedEmail).catch((err) =>
      console.error("Welcome email failed:", err)
    );
    notifyNewSignup(normalizedEmail).catch((err) =>
      console.error("Notify email failed:", err)
    );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json({ success: true });
    }
    console.error("Waitlist error:", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong" },
      { status: 500 }
    );
  }
}
