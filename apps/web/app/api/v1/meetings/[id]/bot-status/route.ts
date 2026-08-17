export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { findScopedMeeting, resolveMeetingCaller } from "@/lib/meetings";

type RouteParams = { params: Promise<{ id: string }> };

// The in-Meet button polls the GET below from meet.google.com.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-gg-session, x-gg-bot",
  "Access-Control-Max-Age": "86400",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * GET /api/v1/meetings/:id/bot-status — how is this recording actually going?
 *
 * Deliberately separate from `GET /meetings/:id`, which presigns playback urls
 * and nudges the Sarvam job along. That is the right thing when a human opens
 * a meeting page and completely wrong to run every few seconds from a button
 * inside a live call.
 *
 * Without this the button could only report what it had *asked* for, so a bot
 * that was dispatched but never admitted looked exactly like one that was
 * recording happily — and a call went unrecorded behind a confident red dot.
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const caller = await resolveMeetingCaller(request);
    if (!caller) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401, headers: CORS_HEADERS }
      );
    }

    const { id } = await params;
    const meeting = await findScopedMeeting(caller, id);
    if (!meeting) {
      return NextResponse.json(
        { success: false, error: "Not found" },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: meeting.id,
          repoId: meeting.repoId,
          repoFullName: caller.repos.find((r) => r.id === meeting.repoId)?.fullName ?? "",
          botStatus: meeting.botStatus,
          botError: meeting.botError,
          status: meeting.status,
        },
      },
      { headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error("Bot status read error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

/** States the bot reports as it works through a call. */
const BOT_STATES = new Set([
  "DISPATCHING",
  "JOINING",
  "WAITING_ADMIT",
  "RECORDING",
  "UPLOADING",
  "DONE",
  "FAILED",
]);

/**
 * POST /api/v1/meetings/:id/bot-status
 *
 * Live progress from the bot service. Bot-only.
 *
 * This exists so the dashboard can say "waiting to be admitted" instead of
 * showing an indefinite spinner — that state needs a human to press Admit in
 * Meet, and a spinner gives them no reason to.
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const caller = await resolveMeetingCaller(request);
    if (!caller?.isBot) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const meeting = await findScopedMeeting(caller, id);
    if (!meeting) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      botStatus?: string;
      botError?: string;
    };

    const botStatus = body.botStatus ?? "";
    if (!BOT_STATES.has(botStatus)) {
      return NextResponse.json({ success: false, error: "Unknown status" }, { status: 400 });
    }

    await prisma.meeting.update({
      where: { id: meeting.id },
      data: {
        botStatus,
        botError: body.botError?.slice(0, 500) ?? null,
        // The bot failing to join means no recording is coming — say so on the
        // meeting itself rather than leaving it "RECORDING" forever.
        ...(botStatus === "FAILED" ? { status: "FAILED", endsAt: new Date() } : {}),
      },
    });

    return NextResponse.json({ success: true, data: { botStatus } });
  } catch (error) {
    console.error("Bot status error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
