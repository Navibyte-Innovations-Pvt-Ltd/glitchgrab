import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { email, priceFeel, topFeature, currentTool } = await request.json();

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

    // If survey data, update existing entry
    if (priceFeel || topFeature || currentTool) {
      await prisma.waitlist.update({
        where: { email: normalizedEmail },
        data: {
          priceFeel: priceFeel || undefined,
          topFeature: topFeature || undefined,
          currentTool: currentTool || undefined,
        },
      });
      return NextResponse.json({ success: true });
    }

    // Otherwise, create new entry
    await prisma.waitlist.create({
      data: { email: normalizedEmail },
    });

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
