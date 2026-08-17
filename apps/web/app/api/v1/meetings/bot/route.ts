export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { resolveMeetingCaller, scopeRepo } from "@/lib/meetings";
import { botAlreadyOnCall, isMeetUrl, startBotRecording } from "@/lib/meet-bot";

/**
 * POST /api/v1/meetings/bot — send the bot to a Google Meet call.
 *
 * Body: { repoId, meetUrl, title? }
 *
 * The bot itself cannot call this: `scopeRepo` returns null for a bot caller,
 * so starting a recording always requires a real user with access to the
 * project. A leaked bot secret can finish an existing recording, never invent
 * one against someone else's repo.
 */
export async function POST(request: Request) {
  try {
    const caller = await resolveMeetingCaller(request);
    if (!caller || caller.isBot) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      repoId?: string;
      meetUrl?: string;
      title?: string;
    };

    // No repoId means "record it, I'll file it later" — the first call about a
    // prospect, or an idea with no repo behind it. An unfiled meeting is owned
    // by its creator alone, so it needs a real user: a QA tester session has no
    // dashboard user and would create a row nobody could ever see again.
    const unfiled = !body.repoId;
    const repo = unfiled ? null : scopeRepo(caller, body.repoId);

    if (!unfiled && !repo) {
      return NextResponse.json(
        { success: false, error: "Pick a project you have access to" },
        { status: 403 }
      );
    }
    if (unfiled && !caller.userId) {
      return NextResponse.json(
        { success: false, error: "Pick a project — unfiled recordings need a signed-in account" },
        { status: 403 }
      );
    }

    const meetUrl = (body.meetUrl ?? "").trim();
    if (!isMeetUrl(meetUrl)) {
      return NextResponse.json(
        { success: false, error: "That doesn't look like a Google Meet link" },
        { status: 400 }
      );
    }

    // Two bots joining one call is visible to the client — refuse rather than
    // quietly duplicate.
    const running = await botAlreadyOnCall(meetUrl);
    if (running) {
      // Name the project it is filed under. "A bot is already on that call" on
      // a call you sent nothing to is unactionable — the useful question is
      // always "which recording is this, then?".
      const where = running.repoId
        ? caller.repos.find((r) => r.id === running.repoId)?.fullName
        : "no project yet";
      return NextResponse.json(
        {
          success: false,
          error: where
            ? `Already recording this call to ${where}`
            : "A bot is already on that call",
          data: { meetingId: running.id, repoId: running.repoId },
        },
        { status: 409 }
      );
    }

    const { meetingId, dispatch } = await startBotRecording({
      repoId: repo?.id ?? null,
      meetUrl,
      title: body.title?.trim() || null,
      userId: caller.userId,
    });

    if (!dispatch.ok) {
      // 502, not 500: the failure is the bot service, and the message says so
      // rather than leaving the user guessing at a generic error.
      return NextResponse.json(
        { success: false, error: dispatch.error, data: { meetingId } },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, data: { meetingId } });
  } catch (error) {
    console.error("Bot dispatch error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
