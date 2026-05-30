export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

const MAX_EVENTS = 2000;
const MAX_EVENT_LABEL_LEN = 200;
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

interface CaptureEvent {
  type: string;
  t: number;
  label?: string;
  tag?: string;
  url?: string;
  durationMs?: number;
}

function sanitizeEvents(raw: unknown): CaptureEvent[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, MAX_EVENTS)
    .filter((e): e is Record<string, unknown> => e !== null && typeof e === "object")
    .map((e) => ({
      type: String(e.type ?? "unknown").slice(0, 50),
      t: typeof e.t === "number" ? Math.max(0, Math.floor(e.t)) : 0,
      label: typeof e.label === "string" ? e.label.slice(0, MAX_EVENT_LABEL_LEN) : undefined,
      tag: typeof e.tag === "string" ? e.tag.slice(0, 30) : undefined,
      url: typeof e.url === "string" ? e.url.slice(0, 500) : undefined,
      durationMs: typeof e.durationMs === "number" ? Math.floor(e.durationMs) : undefined,
    }));
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const events = sanitizeEvents(body.events);

    if (events.length === 0) {
      return NextResponse.json(
        { success: false, error: "events array required" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const session = await prisma.captureSession.create({
      data: {
        events: events as object[],
        meta: body.meta ?? undefined,
        expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      },
      select: { id: true },
    });

    return NextResponse.json(
      { success: true, data: { sessionId: session.id } },
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
