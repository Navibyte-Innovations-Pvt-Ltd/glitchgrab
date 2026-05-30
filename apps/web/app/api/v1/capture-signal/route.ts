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

export interface ClipRange {
  startMs: number;
  endMs: number;
}

export interface RecordingMeta {
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

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export function GET() {
  return NextResponse.json(state, { headers: CORS });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as Partial<SignalState>;

  if (body.signal) state.signal = body.signal;
  if (body.sessionId !== undefined) state.sessionId = body.sessionId;
  if (body.meta) state.meta = body.meta;
  state.signalAt = Date.now();

  return NextResponse.json({ ok: true, state }, { headers: CORS });
}
