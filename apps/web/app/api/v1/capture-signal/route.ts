// In-memory signal bus for local dev.
// Recordly extension writes start/stop → Chrome extension polls and reacts.
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

type Signal = "start" | "stop" | "idle";

// Module-level — persists across requests in next dev (single process)
let signal: Signal = "idle";
let signalAt = 0;

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export function GET() {
  return NextResponse.json(
    { signal, signalAt },
    { headers: CORS }
  );
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as { signal?: string };
  if (body.signal === "start" || body.signal === "stop" || body.signal === "idle") {
    signal = body.signal;
    signalAt = Date.now();
  }
  return NextResponse.json({ ok: true, signal }, { headers: CORS });
}
