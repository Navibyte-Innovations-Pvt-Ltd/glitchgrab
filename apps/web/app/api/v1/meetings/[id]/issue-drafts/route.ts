export const dynamic = "force-dynamic";
// A vision call over a full transcript is not a two-second request. The
// narration route learned the same thing; give it room rather than returning a
// timeout to someone who then re-runs it and pays twice.
export const maxDuration = 300;

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { findScopedMeeting, resolveMeetingCaller } from "@/lib/meetings";
import { presignRecordingPlayback } from "@/lib/recordings";
import { getOpenIssues } from "@/lib/ai-assist/issues";
import { extractIssues } from "@/lib/meeting-issues/extract";
import { claimExtraction } from "@/lib/meeting-issues/quota";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * The drafts panel on a recorded call.
 *
 * GET lists what the assistant already produced; POST reads the call and
 * produces it. Nothing here touches GitHub — filing is a separate, deliberate
 * call to `issue-drafts/create`, because the entire point of the panel is the
 * gap between what the model heard and what the room actually meant.
 */

interface DraftRow {
  id: string;
  title: string;
  body: string;
  labels: string[];
  quotes: unknown;
  frameIds: unknown;
  status: string;
  corrections: unknown;
  position: number;
  githubNumber: number | null;
  githubUrl: string | null;
}

async function serialise(meetingId: string, drafts: DraftRow[]) {
  const ids = new Set<string>();
  for (const d of drafts) {
    for (const f of (d.frameIds as string[] | null) ?? []) ids.add(f);
  }

  const frames = ids.size
    ? await prisma.meetingFrame.findMany({ where: { id: { in: [...ids] }, meetingId } })
    : [];

  const urls = new Map<string, { tMs: number; url: string | null }>();
  await Promise.all(
    frames.map(async (f) => {
      urls.set(f.id, { tMs: f.tMs, url: await presignRecordingPlayback(f.key).catch(() => null) });
    })
  );

  return drafts.map((d) => ({
    id: d.id,
    title: d.title,
    body: d.body,
    labels: d.labels,
    quotes: (d.quotes as unknown[]) ?? [],
    status: d.status,
    corrections: (d.corrections as unknown[]) ?? [],
    position: d.position,
    githubNumber: d.githubNumber,
    githubUrl: d.githubUrl,
    frames: ((d.frameIds as string[] | null) ?? [])
      .map((id) => ({ id, ...(urls.get(id) ?? { tMs: 0, url: null }) }))
      .filter((f) => f.url),
  }));
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const caller = await resolveMeetingCaller(request);
    if (!caller) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const meeting = await findScopedMeeting(caller, id);
    if (!meeting) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    const [drafts, frameCount] = await Promise.all([
      prisma.meetingIssueDraft.findMany({
        where: { meetingId: meeting.id },
        orderBy: { position: "asc" },
      }),
      prisma.meetingFrame.count({ where: { meetingId: meeting.id } }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        drafts: await serialise(meeting.id, drafts),
        frameCount,
        extractedAt: meeting.issuesExtractedAt?.toISOString() ?? null,
        // The button is meaningless without words to read, and "no transcript
        // yet" is a wait, not a failure — the panel says which one it is.
        canExtract: Boolean(meeting.transcript && meeting.transcript.trim().length > 0),
        hasRepo: Boolean(meeting.repoId),
      },
    });
  } catch (error) {
    console.error("Meeting drafts fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/meetings/:id/issue-drafts — read the call, produce drafts.
 *
 * Dashboard session only. The bot has no business asking for AI work, and an
 * extension session belongs to a QA tester who does not decide what gets built.
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

    const { id } = await params;
    const meeting = await findScopedMeeting(caller, id);
    if (!meeting) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    if (!meeting.transcript?.trim()) {
      return NextResponse.json(
        { success: false, error: "This call has no transcript yet." },
        { status: 400 }
      );
    }

    const quota = await claimExtraction({ repoId: meeting.repoId, meetingId: meeting.id });
    if (!quota.ok) {
      return NextResponse.json(
        {
          success: false,
          error: "This project has read its limit of calls this month.",
        },
        { status: 429 }
      );
    }

    const [frames, repo] = await Promise.all([
      prisma.meetingFrame.findMany({
        where: { meetingId: meeting.id },
        orderBy: { tMs: "asc" },
        select: { id: true, tMs: true, key: true },
      }),
      meeting.repoId
        ? prisma.repo.findUnique({
            where: { id: meeting.repoId },
            select: { id: true, fullName: true },
          })
        : null,
    ]);

    // Duplicate-checking against what is already filed is the difference
    // between a panel of new work and a panel restating the backlog. Best
    // effort: a GitHub hiccup must not cost the extraction.
    const openIssueTitles = repo
      ? await getOpenIssues(repo.id)
          .then((issues) => issues.slice(0, 60).map((i) => i.title))
          .catch(() => [])
      : [];

    const result = await extractIssues({
      repoFullName: repo?.fullName ?? "unfiled call",
      title: meeting.title,
      transcript: meeting.transcript,
      frames,
      openIssueTitles,
    });

    // Only DRAFT rows are replaced. A draft already filed on GitHub is history
    // and a discarded one is a decision — re-running must not resurrect either.
    const created = await prisma.$transaction(async (tx) => {
      await tx.meetingIssueDraft.deleteMany({
        where: { meetingId: meeting.id, status: "DRAFT" },
      });

      const rows = [];
      for (const [index, d] of result.drafts.entries()) {
        rows.push(
          await tx.meetingIssueDraft.create({
            data: {
              meetingId: meeting.id,
              title: d.title,
              body: d.body,
              labels: d.labels,
              quotes: d.quotes,
              frameIds: d.frames,
              position: index,
            },
          })
        );
      }

      return rows;
    });

    return NextResponse.json({
      success: true,
      data: {
        drafts: await serialise(meeting.id, created),
        model: result.model,
        framesUsed: result.framesUsed.length,
        remaining: quota.remaining,
      },
    });
  } catch (error) {
    console.error("Meeting drafts extract error:", error);
    return NextResponse.json(
      { success: false, error: "Could not read this call." },
      { status: 500 }
    );
  }
}
