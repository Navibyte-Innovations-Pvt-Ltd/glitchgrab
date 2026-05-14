export const dynamic = "force-dynamic";

import { createHmac } from "crypto";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

function signState(payload: string): string {
  const secret = process.env.AUTH_SECRET ?? "";
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function buildGscAuthUrl(userId: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID ?? "";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  const payload = JSON.stringify({ userId, ts: Date.now() });
  const sig = signState(payload);
  const state = Buffer.from(JSON.stringify({ payload, sig })).toString("base64url");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${appUrl}/api/v1/gsc/callback`,
    response_type: "code",
    scope: [
      "https://www.googleapis.com/auth/webmasters.readonly",
      "https://www.googleapis.com/auth/indexing",
    ].join(" "),
    access_type: "offline",
    prompt: "select_account consent",
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!clientId || !appUrl) {
    return NextResponse.json(
      { success: false, error: "Google OAuth not configured" },
      { status: 500 }
    );
  }

  return NextResponse.redirect(buildGscAuthUrl(session.user.id));
}
