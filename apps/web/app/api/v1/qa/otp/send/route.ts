export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendWhatsappOtp } from "@/lib/whatsapp";
import { sendSmsOtp, smsConfigured } from "@/lib/sms";
import { checkRateLimit } from "@/lib/rate-limit";
import { createHash, randomInt } from "crypto";

const OTP_TTL_MS = 10 * 60 * 1000;

function hashOtp(otp: string, testerId: string): string {
  return createHash("sha256").update(`${otp}:${testerId}`).digest("hex");
}

/**
 * POST /api/v1/qa/otp/send — start tester login.
 * Body: { phone, channel?: "sms" | "whatsapp" }.
 *
 * SMS is the default because a tester may not have WhatsApp at all, but it only
 * delivers once the Msg91 DLT template is approved — `smsConfigured()` is false
 * until every part of that registration is in env, and an unapproved template is
 * dropped by the operator AFTER Msg91 returns a request id. So when SMS is not
 * configured (or its send fails) this falls back to the WhatsApp OTP that has
 * been working all along, and reports back which channel actually carried it.
 */
export async function POST(req: Request) {
  const body = (await req.json()) as { phone?: string; channel?: "sms" | "whatsapp" };
  const cleaned = (body.phone ?? "").replace(/\D/g, "");
  const requested: "sms" | "whatsapp" = body.channel === "whatsapp" ? "whatsapp" : "sms";

  if (!cleaned || cleaned.length < 10 || cleaned.length > 15) {
    return NextResponse.json(
      { success: false, error: "Enter a valid WhatsApp number with country code." },
      { status: 400 }
    );
  }

  const rate = await checkRateLimit(`qa-otp-send:${cleaned}`, 5, 60 * 60 * 1000);
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

  const useSms = requested === "sms" && smsConfigured();
  let channel: "sms" | "whatsapp" = useSms ? "sms" : "whatsapp";
  let sent = useSms ? await sendSmsOtp(cleaned, otp) : await sendWhatsappOtp(cleaned, otp);

  // SMS asked for but undeliverable → don't strand the tester on a dead channel.
  if (!sent.ok && channel === "sms") {
    console.error("[qa-otp] SMS send failed, falling back to WhatsApp:", sent.error);
    channel = "whatsapp";
    sent = await sendWhatsappOtp(cleaned, otp);
  }

  if (!sent.ok) {
    await prisma.testerOtp.deleteMany({ where: { testerId: tester.id } });
    return NextResponse.json({ success: false, error: sent.error ?? "Failed to send OTP" }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: { channel } });
}
