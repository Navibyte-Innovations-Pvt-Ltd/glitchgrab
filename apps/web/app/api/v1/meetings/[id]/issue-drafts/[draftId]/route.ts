export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { findScopedMeeting, resolveMeetingCaller } from "@/lib/meetings";

type RouteParams = { params: Promise<{ id: string; draftId: string }> };

/**
 * Hand edits and rejection.
 *
 * Chatting at a draft is the interesting path, but sometimes the fix is one
 * word in the title and arguing with a model about it is absurd. PATCH is that
 * escape hatch; DELETE marks a draft rejected rather than removing it, so a
 * re-run does not hand back the thing someone already said no to.
 */

async function loadDraft(request: Request, id: string, draftId: string) {
  const caller = await resolveMeetingCaller(request);
  if (!caller) return { error: "Unauthorized" as const, status: 401 };

  const meeting = await findScopedMeeting(caller, id);
  if (!meeting) return { error: "Not found" as const, status: 404 };

  const draft = await prisma.meetingIssueDraft.findFirst({
    where: { id: draftId, meetingId: meeting.id },
  });
  if (!draft) return { error: "Not found" as const, status: 404 };

  return { meeting, draft };
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id, draftId } = await params;
    const found = await loadDraft(request, id, draftId);
    if ("error" in found) {
      return NextResponse.json({ success: false, error: found.error }, { status: found.status });
    }

    if (found.draft.status === "CREATED") {
      return NextResponse.json(
        { success: false, error: "This one is already on GitHub — edit it there." },
        { status: 409 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      title?: string;
      body?: string;
      labels?: string[];
      status?: string;
    };

    const updated = await prisma.meetingIssueDraft.update({
      where: { id: found.draft.id },
      data: {
        ...(typeof body.title === "string" && body.title.trim()
          ? { title: body.title.trim().slice(0, 200) }
          : {}),
        ...(typeof body.body === "string" ? { body: body.body } : {}),
        ...(Array.isArray(body.labels)
          ? { labels: body.labels.filter((l): l is string => typeof l === "string").slice(0, 5) }
          : {}),
        ...(body.status === "DRAFT" || body.status === "DISCARDED"
          ? { status: body.status }
          : {}),
      },
    });

    return NextResponse.json({
      success: true,
      data: { id: updated.id, title: updated.title, body: updated.body, labels: updated.labels, status: updated.status },
    });
  } catch (error) {
    console.error("Meeting draft update error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id, draftId } = await params;
    const found = await loadDraft(request, id, draftId);
    if ("error" in found) {
      return NextResponse.json({ success: false, error: found.error }, { status: found.status });
    }

    if (found.draft.status === "CREATED") {
      return NextResponse.json(
        { success: false, error: "This one is already on GitHub — close it there." },
        { status: 409 }
      );
    }

    // Marked, not deleted: a re-extraction only clears DRAFT rows, so this is
    // what stops a rejected idea coming back every time someone re-runs.
    await prisma.meetingIssueDraft.update({
      where: { id: found.draft.id },
      data: { status: "DISCARDED" },
    });

    return NextResponse.json({ success: true, data: { id: draftId } });
  } catch (error) {
    console.error("Meeting draft delete error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
