export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { createHash, timingSafeEqual } from "crypto";
import { signTesterSession, TESTER_COOKIE_NAME, TESTER_COOKIE_MAX_AGE } from "@/lib/tester-session";

const MAX_ATTEMPTS = 5;

function hashOtp(otp: string, testerId: string): string {
  return createHash("sha256").update(`${otp}:${testerId}`).digest("hex");
}

/**
 * POST /api/v1/qa/otp/verify — finish tester login.
 * Body: { phone, otp }. On success sets the signed gg_tester cookie.
 */
export async function POST(req: Request) {
  const body = (await req.json()) as { phone?: string; otp?: string };
  const cleaned = (body.phone ?? "").replace(/\D/g, "");
  const otp = (body.otp ?? "").trim();

  const rate = await checkRateLimit(`qa-otp-verify:${cleaned}`, 20, 60 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json({ success: false, error: "Too many attempts. Try again later." }, { status: 429 });
  }

  const tester = await prisma.tester.findFirst({ where: { phone: cleaned } });
  if (!tester) {
    return NextResponse.json({ success: false, error: "No OTP sent for this number." }, { status: 400 });
  }

  const record = await prisma.testerOtp.findFirst({
    where: { testerId: tester.id, phone: cleaned },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    return NextResponse.json({ success: false, error: "No OTP sent for this number. Request a new one." }, { status: 400 });
  }
  if (record.expiresAt < new Date()) {
    return NextResponse.json({ success: false, error: "OTP expired. Request a new one." }, { status: 400 });
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    await prisma.testerOtp.deleteMany({ where: { id: record.id } });
    return NextResponse.json({ success: false, error: "Too many incorrect attempts. Request a new OTP." }, { status: 429 });
  }

  const hash = hashOtp(otp, tester.id);
  const hashBuf = Buffer.from(hash);
  const recordBuf = Buffer.from(record.otpHash);
  const match = hashBuf.length === recordBuf.length && timingSafeEqual(hashBuf, recordBuf);

  if (!match) {
    await prisma.testerOtp.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
    return NextResponse.json({ success: false, error: "Incorrect OTP." }, { status: 400 });
  }

  await prisma.testerOtp.deleteMany({ where: { testerId: tester.id } });

  const res = NextResponse.json({ success: true });
  res.cookies.set(TESTER_COOKIE_NAME, signTesterSession(tester.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TESTER_COOKIE_MAX_AGE,
  });
  return res;
}
