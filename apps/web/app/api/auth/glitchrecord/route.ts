// GlitchRecord desktop app auth flow
// 1. GlitchRecord opens: glitchgrab.dev/api/auth/glitchrecord?redirect=glitchrecord://auth
// 2. User must be logged in (session cookie)
// 3. We generate a gg_ API token for them
// 4. Redirect to glitchrecord://auth?token=gg_...
// 5. Electron catches the deep link, stores token in Keychain
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateToken, hashToken } from "@/lib/tokens";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    // Not logged in → redirect to sign in, then come back
    const callbackUrl = encodeURIComponent(request.url);
    return NextResponse.redirect(
      new URL(`/api/auth/signin?callbackUrl=${callbackUrl}`, request.url)
    );
  }

  const url = new URL(request.url);
  const redirect = url.searchParams.get("redirect") ?? "glitchrecord://auth";

  // Generate a long-lived API token for GlitchRecord
  const plainToken = generateToken();
  const tokenHash = hashToken(plainToken);

  await prisma.apiToken.create({
    data: {
      userId: session.user.id,
      tokenHash,
      name: "GlitchRecord Desktop",
    },
  });

  // Deep link back to GlitchRecord with token
  const callbackUrl = `${redirect}?token=${plainToken}&userId=${session.user.id}`;
  return NextResponse.redirect(callbackUrl);
}
