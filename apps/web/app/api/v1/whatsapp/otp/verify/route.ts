import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { createHash, timingSafeEqual } from "crypto";

const MAX_ATTEMPTS = 5;

function hashOtp(otp: string, userId: string): string {
  return createHash("sha256").update(`${otp}:${userId}`).digest("hex");
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const rate = await checkRateLimit(`wa-otp-verify:${session.user.id}`, 20, 60 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json({ success: false, error: "Too many attempts. Try again later." }, { status: 429 });
  }

  const body = await req.json() as { phone?: string; otp?: string };
  const cleaned = (body.phone ?? "").replace(/\D/g, "");
  const otp = (body.otp ?? "").trim();

  const record = await prisma.whatsappOtp.findFirst({
    where: { userId: session.user.id, phone: cleaned },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    return NextResponse.json({ success: false, error: "No OTP sent for this number. Request a new one." }, { status: 400 });
  }
  if (record.expiresAt < new Date()) {
    return NextResponse.json({ success: false, error: "OTP expired. Request a new one." }, { status: 400 });
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    await prisma.whatsappOtp.deleteMany({ where: { id: record.id } });
    return NextResponse.json({ success: false, error: "Too many incorrect attempts. Request a new OTP." }, { status: 429 });
  }

  const hash = hashOtp(otp, session.user.id);
  const hashBuf = Buffer.from(hash);
  const recordBuf = Buffer.from(record.otpHash);
  const match = hashBuf.length === recordBuf.length && timingSafeEqual(hashBuf, recordBuf);

  if (!match) {
    await prisma.whatsappOtp.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
    return NextResponse.json({ success: false, error: "Incorrect OTP." }, { status: 400 });
  }

  await Promise.all([
    prisma.user.update({ where: { id: session.user.id }, data: { whatsappPhone: cleaned } }),
    prisma.whatsappOtp.deleteMany({ where: { userId: session.user.id } }),
  ]);

  return NextResponse.json({ success: true });
}
