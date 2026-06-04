export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sanitizeEvents } from "./sanitize";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
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
