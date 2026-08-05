export const dynamic = "force-dynamic";

// Resolves who an ExtensionSession actually belongs to, server-side.
//
// Exists because the GlitchRecord desktop app accepts a session id over a
// glitchrecord://tester-auth deep link — and ANY local app or web page can
// fire a custom-protocol URL. The app must never render an identity taken
// from the link's own query string: it resolves it here first, then shows the
// *server's* answer in a confirmation prompt before switching reporter.
//
// Repos come back too so the prompt can show what the caller is about to gain
// access to. No new disclosure: /api/v1/extension/repos already returns the
// same list for the same unguessable-cuid trust model.
import { NextResponse } from "next/server";
import { getExtensionSessionIdentity, getExtensionSessionRepos } from "@/lib/extension-session";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const identity = await getExtensionSessionIdentity(id);
  if (!identity) {
    return NextResponse.json(
      { success: false, error: "Session not found or ended" },
      { status: 404, headers: CORS }
    );
  }

  const repos = await getExtensionSessionRepos(identity);
  return NextResponse.json(
    {
      success: true,
      data: {
        testerName: identity.testerName,
        testerEmail: identity.testerEmail,
        isTester: !!identity.testerId,
        repos,
      },
    },
    { headers: CORS }
  );
}
