"use server";

import { createHash, randomInt } from "crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendWhatsappOtp } from "@/lib/whatsapp";

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

function hashOtp(otp: string, userId: string): string {
  return createHash("sha256").update(`${otp}:${userId}`).digest("hex");
}

function cleanPhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export async function getWhatsappPhone(): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { whatsappPhone: true },
  });
  return user?.whatsappPhone ?? null;
}

export async function sendOtp(phone: string): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Unauthorized" };

  const cleaned = cleanPhone(phone);
  if (!cleaned || cleaned.length < 11 || cleaned.length > 15) {
    return { ok: false, error: "Include country code — digits only, 11–15 chars (e.g. 919876543210 for India)" };
  }

  // Delete previous OTPs for this user
  await prisma.whatsappOtp.deleteMany({ where: { userId: session.user.id } });

  const otp = String(randomInt(100000, 999999));
  const otpHash = hashOtp(otp, session.user.id);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await prisma.whatsappOtp.create({
    data: { userId: session.user.id, phone: cleaned, otpHash, expiresAt },
  });

  const sent = await sendWhatsappOtp(cleaned, otp);
  if (!sent) {
    await prisma.whatsappOtp.deleteMany({ where: { userId: session.user.id } });
    return { ok: false, error: "Failed to send OTP. Check your WhatsApp credentials." };
  }

  return { ok: true };
}

export async function verifyAndSavePhone(
  phone: string,
  otp: string
): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Unauthorized" };

  const cleaned = cleanPhone(phone);

  const record = await prisma.whatsappOtp.findFirst({
    where: { userId: session.user.id, phone: cleaned },
    orderBy: { createdAt: "desc" },
  });

  if (!record) return { ok: false, error: "No OTP sent for this number. Request a new one." };
  if (record.expiresAt < new Date()) return { ok: false, error: "OTP expired. Request a new one." };

  const hash = hashOtp(otp.trim(), session.user.id);
  if (hash !== record.otpHash) return { ok: false, error: "Incorrect OTP." };

  // Save verified phone and delete OTP records
  await Promise.all([
    prisma.user.update({
      where: { id: session.user.id },
      data: { whatsappPhone: cleaned },
    }),
    prisma.whatsappOtp.deleteMany({ where: { userId: session.user.id } }),
  ]);

  return { ok: true };
}

export async function removeWhatsappPhone(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  await prisma.user.update({
    where: { id: session.user.id },
    data: { whatsappPhone: null },
  });
}
