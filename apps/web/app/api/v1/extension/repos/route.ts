export const dynamic = "force-dynamic";

// Repos the extension's own "Report Bug" repo picker may show (#297) —
// scoped server-side: a QA tester sees only repos they're assigned
// (TesterRepo), a dashboard owner sees every repo they own. Auth: the
// ExtensionSession id (from auto-login), passed as a query param — same
// unguessable-cuid trust model as ping/end.
import { NextResponse } from "next/server";
import { getExtensionSessionIdentity, getExtensionSessionRepos } from "@/lib/extension-session";

export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ success: false, error: "sessionId required" }, { status: 400 });
  }

  const identity = await getExtensionSessionIdentity(sessionId);
  if (!identity) {
    return NextResponse.json({ success: false, error: "Session not found or ended" }, { status: 404 });
  }

  const repos = await getExtensionSessionRepos(identity);
  return NextResponse.json({ success: true, data: repos });
}
