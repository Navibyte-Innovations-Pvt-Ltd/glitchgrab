export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendWhatsappOtp } from "@/lib/whatsapp";
import { checkRateLimit } from "@/lib/rate-limit";
import { createHash, randomInt } from "crypto";

const OTP_TTL_MS = 10 * 60 * 1000;

function hashOtp(otp: string, testerId: string): string {
  return createHash("sha256").update(`${otp}:${testerId}`).digest("hex");
}

/**
 * POST /api/v1/qa/otp/send — start tester login.
 * Body: { phone }. Sends a WhatsApp OTP (reuses the "wa_otp" template) if the
 * number belongs to a registered tester.
 */
export async function POST(req: Request) {
  const body = (await req.json()) as { phone?: string };
  const cleaned = (body.phone ?? "").replace(/\D/g, "");

  if (!cleaned || cleaned.length < 10 || cleaned.length > 15) {
    return NextResponse.json(
      { success: false, error: "Enter a valid WhatsApp number with country code." },
      { status: 400 }
    );
  }

  const rate = checkRateLimit(`qa-otp-send:${cleaned}`, 5, 60 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json({ success: false, error: "Too many OTP requests. Try again later." }, { status: 429 });
  }

  const tester = await prisma.tester.findFirst({ where: { phone: cleaned } });
  if (!tester) {
    return NextResponse.json(
      { success: false, error: "This number isn't registered as a tester. Ask your admin to add you." },
      { status: 404 }
    );
  }

  await prisma.testerOtp.deleteMany({ where: { testerId: tester.id } });

  const otp = String(randomInt(100000, 999999));
  const otpHash = hashOtp(otp, tester.id);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await prisma.testerOtp.create({
    data: { testerId: tester.id, phone: cleaned, otpHash, expiresAt },
  });

  const sent = await sendWhatsappOtp(cleaned, otp);
  if (!sent.ok) {
    await prisma.testerOtp.deleteMany({ where: { testerId: tester.id } });
    return NextResponse.json({ success: false, error: sent.error ?? "Failed to send OTP" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
