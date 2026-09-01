export const dynamic = "force-dynamic";
export const maxDuration = 120;

import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { findScopedMeeting, resolveMeetingCaller } from "@/lib/meetings";
import { geminiChat } from "@/lib/gemini/client";
import { deepseekChat } from "@/lib/deepseek/client";
import {
  buildCorrectionPrompt,
  CORRECT_SYSTEM_PROMPT,
  MAX_CORRECTION_TURNS,
  parseJsonReply,
} from "@/lib/meeting-issues/prompt";

type RouteParams = { params: Promise<{ id: string; draftId: string }> };

const MAX_MESSAGE_CHARS = 2000;

interface CorrectionTurn {
  role: "user" | "assistant";
  content: string;
}

/**
 * POST /api/v1/meetings/:id/issue-drafts/:draftId/chat
 *
 * "That is not what we meant" — the message this whole feature is built around.
 * Someone who sat in the call tells the model the domain word it mistranslated,
 * and the ONE draft they are pointing at is rewritten.
 *
 * Deliberately scoped to a single draft. Correcting "attendance means WhatsApp,
 * not a biometric device" should not get a chance to rewrite the four other
 * issues that were already right.
 *
 * Text only, no frames: a correction is about meaning, not about pixels, and
 * re-sending sixteen images per sentence is how a cheap feature becomes an
 * expensive one.
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const caller = await resolveMeetingCaller(request);
    if (!caller) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id, draftId } = await params;
    const meeting = await findScopedMeeting(caller, id);
    if (!meeting) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    const draft = await prisma.meetingIssueDraft.findFirst({
      where: { id: draftId, meetingId: meeting.id },
    });
    if (!draft) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }
    if (draft.status === "CREATED") {
      return NextResponse.json(
        { success: false, error: "This one is already on GitHub — edit it there." },
        { status: 409 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as { message?: string };
    const message = (body.message ?? "").trim().slice(0, MAX_MESSAGE_CHARS);
    if (!message) {
      return NextResponse.json({ success: false, error: "message required" }, { status: 400 });
    }

    const history = ((draft.corrections as CorrectionTurn[] | null) ?? []).filter(
      (t) => t && (t.role === "user" || t.role === "assistant")
    );

    // Past this, the model is not converging and another turn will not fix it.
    // The manual edit is still right there, so nobody is stuck.
    if (history.filter((t) => t.role === "user").length >= MAX_CORRECTION_TURNS) {
      return NextResponse.json(
        {
          success: false,
          error: "This draft has been argued with enough — edit it directly.",
        },
        { status: 429 }
      );
    }

    const prompt = buildCorrectionPrompt({
      draft: {
        title: draft.title,
        body: draft.body,
        labels: draft.labels,
        quotes: draft.quotes,
      },
      history,
      message,
      transcript: meeting.transcript ?? "",
    });

    let raw: string;
    try {
      raw = await geminiChat({
        model: "gemini-2.5-pro",
        messages: [
          { role: "system", content: CORRECT_SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        maxTokens: 4096,
        temperature: 0.3,
      });
    } catch (err) {
      console.error("[meeting-issues] correction fell back to deepseek:", err);
      raw = await deepseekChat({
        model: "deepseek-v4-flash",
        messages: [
          { role: "system", content: CORRECT_SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        maxTokens: 4096,
        temperature: 0.3,
      });
    }

    const parsed = parseJsonReply<{
      reply?: string;
      issue?: { title?: string; body?: string; labels?: unknown };
    }>(raw);

    if (!parsed?.issue?.title || !parsed.issue.body) {
      // The draft is untouched and their words are kept, so the retry costs
      // them nothing but the button press.
      return NextResponse.json(
        { success: false, error: "The assistant did not come back with a usable rewrite." },
        { status: 502 }
      );
    }

    const reply = (parsed.reply ?? "Updated.").slice(0, 500);
    const nextHistory: CorrectionTurn[] = [
      ...history,
      { role: "user", content: message },
      { role: "assistant", content: reply },
    ];

    const updated = await prisma.meetingIssueDraft.update({
      where: { id: draft.id },
      data: {
        title: parsed.issue.title.trim().slice(0, 200),
        body: parsed.issue.body,
        labels: Array.isArray(parsed.issue.labels)
          ? parsed.issue.labels.filter((l): l is string => typeof l === "string").slice(0, 5)
          : draft.labels,
        // Prisma types a Json column as an object, not an array of them.
        corrections: nextHistory as unknown as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        reply,
        draft: {
          id: updated.id,
          title: updated.title,
          body: updated.body,
          labels: updated.labels,
          // Prisma types a Json column as an object, not an array of them.
        corrections: nextHistory as unknown as Prisma.InputJsonValue,
        },
      },
    });
  } catch (error) {
    console.error("Meeting draft chat error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
