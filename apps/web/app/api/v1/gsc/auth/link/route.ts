export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildGscAuthUrl, setGscStateCookie } from "@/app/api/v1/gsc/auth/route";

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

  // The client navigates to this url itself, so the nonce cookie has to ride
  // back on THIS response — otherwise the callback has nothing to compare to.
  const { url, nonce } = buildGscAuthUrl(session.user.id);
  return setGscStateCookie(NextResponse.json({ success: true, data: { url } }), nonce);
}
