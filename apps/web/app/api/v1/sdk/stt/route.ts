export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/tokens";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

const SARVAM_STT_URL = "https://api.sarvam.ai/speech-to-text";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.SARVAM_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "STT not configured" },
        { status: 503, headers: CORS_HEADERS }
      );
    }

    // Auth: Bearer gg_ token OR dashboard session (session is fallback for both cases)
    let authed = false;
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer gg_")) {
      const plainToken = authHeader.replace("Bearer ", "");
      const tokenHash = hashToken(plainToken);
      const apiToken = await prisma.apiToken.findUnique({
        where: { tokenHash },
        select: { id: true },
      });
      if (apiToken) {
        prisma.apiToken
          .update({ where: { id: apiToken.id }, data: { lastUsed: new Date() } })
          .catch(() => {});
        authed = true;
      }
    }
    if (!authed) {
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json(
          { success: false, error: "Unauthorized" },
          { status: 401, headers: CORS_HEADERS }
        );
      }
    }

    const formData = await request.formData();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const file = (formData as any).get("file") as Blob | null;
    if (!file) {
      return NextResponse.json(
        { success: false, error: "audio file is required" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Sarvam rejects 'audio/webm;codecs=opus' — strip codec param, keep 'audio/webm'
    const audioBuffer = await file.arrayBuffer();
    const cleanBlob = new Blob([audioBuffer], { type: "audio/webm" });

    const sarvamForm = new FormData();
    sarvamForm.append("file", cleanBlob, "audio.webm");
    sarvamForm.append("model", "saarika:v2.5");
    // No language_code — let Sarvam auto-detect

    const sarvamRes = await fetch(SARVAM_STT_URL, {
      method: "POST",
      headers: { "api-subscription-key": apiKey },
      body: sarvamForm,
    });

    if (!sarvamRes.ok) {
      const errText = await sarvamRes.text().catch(() => "");
      console.error("[stt] Sarvam error", sarvamRes.status, errText);
      return NextResponse.json(
        { success: false, error: `Sarvam error: ${sarvamRes.status}` },
        { status: 502, headers: CORS_HEADERS }
      );
    }

    const sarvamData = (await sarvamRes.json()) as { transcript?: string };
    const transcript = sarvamData.transcript ?? "";

    return NextResponse.json(
      { success: true, data: { transcript } },
      { headers: CORS_HEADERS }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
