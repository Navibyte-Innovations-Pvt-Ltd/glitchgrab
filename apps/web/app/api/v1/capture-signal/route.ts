// Shared state bus between Recordly extension and Chrome extension.
// Recordly writes recording metadata (clips, cuts, duration).
// Chrome extension polls and auto-starts/stops capture.
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

interface ClipRange {
  startMs: number;
  endMs: number;
}

interface RecordingMeta {
  // Set by Recordly extension at export:complete
  originalDurationMs: number;   // full recording length before cuts
  finalDurationMs: number;      // duration after all cuts applied
  keptRanges: ClipRange[];      // time ranges that ARE in the final video
  cutRanges: ClipRange[];       // time ranges that were CUT OUT
  exportStartedAt: number;      // unix ms
}

interface SignalState {
  signal: "idle" | "start" | "active" | "stop";
  signalAt: number;
  sessionId: string | null;     // set by Chrome extension after upload
  meta: RecordingMeta | null;   // set by Recordly extension at export
}

const state: SignalState = {
  signal: "idle",
  signalAt: 0,
  sessionId: null,
  meta: null,
};

// This bus only ever runs against a local dev server — Recordly and the Chrome
// extension both hardcode http://localhost:3000. Block it in production so the
// unauthenticated, globally-shared state isn't reachable on the public deployment.
function blockedInProd(): NextResponse | null {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return null;
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export function GET() {
  return blockedInProd() ?? NextResponse.json(state, { headers: CORS });
}

export async function POST(req: Request) {
  const blocked = blockedInProd();
  if (blocked) return blocked;

  const body = await req.json().catch(() => ({})) as Partial<SignalState>;

  if (body.signal) state.signal = body.signal;
  if (body.sessionId !== undefined) state.sessionId = body.sessionId;
  if (body.meta) state.meta = body.meta;
  state.signalAt = Date.now();

  return NextResponse.json({ ok: true, state }, { headers: CORS });
}
