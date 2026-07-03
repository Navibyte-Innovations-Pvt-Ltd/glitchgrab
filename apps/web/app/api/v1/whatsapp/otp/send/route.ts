import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendWhatsappOtp } from "@/lib/whatsapp";
import { checkRateLimit } from "@/lib/rate-limit";
import { createHash, randomInt } from "crypto";

const OTP_TTL_MS = 10 * 60 * 1000;

function hashOtp(otp: string, userId: string): string {
  return createHash("sha256").update(`${otp}:${userId}`).digest("hex");
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const rate = await checkRateLimit(`wa-otp-send:${session.user.id}`, 5, 60 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json({ success: false, error: "Too many OTP requests. Try again later." }, { status: 429 });
  }

  const body = await req.json() as { phone?: string };
  const cleaned = (body.phone ?? "").replace(/\D/g, "");

  if (!cleaned || cleaned.length < 11 || cleaned.length > 15) {
    return NextResponse.json(
      { success: false, error: "Include country code — digits only, 11–15 chars (e.g. 919876543210 for India)" },
      { status: 400 }
    );
  }

  await prisma.whatsappOtp.deleteMany({ where: { userId: session.user.id } });

  const otp = String(randomInt(100000, 999999));
  const otpHash = hashOtp(otp, session.user.id);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await prisma.whatsappOtp.create({
    data: { userId: session.user.id, phone: cleaned, otpHash, expiresAt },
  });

  const sent = await sendWhatsappOtp(cleaned, otp);
  if (!sent.ok) {
    await prisma.whatsappOtp.deleteMany({ where: { userId: session.user.id } });
    return NextResponse.json({ success: false, error: sent.error ?? "Failed to send OTP" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
