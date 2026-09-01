export const dynamic = "force-dynamic";
export const maxDuration = 120;

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { findScopedMeeting, resolveMeetingCaller } from "@/lib/meetings";
import { getInstallationAccessToken } from "@/lib/github-app";
import { createGitHubIssue } from "@/lib/github";

type RouteParams = { params: Promise<{ id: string }> };

interface Quote {
  speaker?: string;
  text: string;
  tMs?: number;
}

function stamp(tMs?: number): string {
  if (typeof tMs !== "number") return "";
  const total = Math.round(tMs / 1000);
  return `[${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}] `;
}

/**
 * The provenance footer.
 *
 * A teammate opening this issue three weeks later has one question — who asked
 * for this? — and the answer is a sentence somebody said on a call. Carrying
 * the quotes into the issue is what stops the answer being "the AI decided".
 *
 * Frames are deliberately NOT embedded. The only way to show one on GitHub is a
 * publicly reachable URL, and these are stills of a client's shared screen; the
 * private prefix exists precisely so those never get a public link. They stay
 * on the call page, behind the same access check as the recording.
 */
function footer(params: {
  title: string | null;
  startsAt: Date | null;
  quotes: Quote[];
}): string {
  const when = params.startsAt ? params.startsAt.toLocaleDateString("en-IN") : null;
  const lines = [
    "",
    "---",
    `*From the call${params.title ? ` "${params.title}"` : ""}${when ? ` on ${when}` : ""}, via Glitchgrab.*`,
  ];

  if (params.quotes.length) {
    lines.push("", "<details><summary>What was actually said</summary>", "");
    for (const q of params.quotes.slice(0, 8)) {
      lines.push(`> ${stamp(q.tMs)}${q.speaker ? `**${q.speaker}:** ` : ""}${q.text}`);
      lines.push(">");
    }
    lines.push("</details>");
  }

  return lines.join("\n");
}

/**
 * POST /api/v1/meetings/:id/issue-drafts/create
 *
 * The one irreversible step, and the only one a human presses. Everything up to
 * here is a draft nobody outside this page can see; this puts it on GitHub with
 * the team's name on it.
 *
 * Body: { draftIds: string[] }
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

    if (!meeting.repoId) {
      return NextResponse.json(
        {
          success: false,
          error: "File this call to a project first — there is no repo to open issues in.",
        },
        { status: 400 }
      );
    }

    const repo = await prisma.repo.findUnique({
      where: { id: meeting.repoId },
      select: {
        id: true,
        owner: true,
        name: true,
        installation: { select: { installationId: true } },
      },
    });

    if (!repo) {
      return NextResponse.json({ success: false, error: "Repo not found" }, { status: 404 });
    }
    if (!repo.installation) {
      return NextResponse.json(
        {
          success: false,
          error:
            "GitHub App not installed on this repo — reconnect in Connect Repo to grant access",
        },
        { status: 400 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as { draftIds?: string[] };
    const draftIds = (body.draftIds ?? []).filter((d): d is string => typeof d === "string");
    if (draftIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "Pick at least one draft." },
        { status: 400 }
      );
    }

    const drafts = await prisma.meetingIssueDraft.findMany({
      where: { id: { in: draftIds }, meetingId: meeting.id, status: "DRAFT" },
      orderBy: { position: "asc" },
    });

    if (drafts.length === 0) {
      return NextResponse.json(
        { success: false, error: "Those drafts are already filed or discarded." },
        { status: 409 }
      );
    }

    const installationToken = await getInstallationAccessToken(repo.installation.installationId);
    const reporterName = session.user.name || session.user.email || "Glitchgrab";
    const reporterKey = session.user.email || session.user.id;

    const created: { id: string; number: number; url: string }[] = [];
    const failed: { id: string; title: string; error: string }[] = [];

    // Sequential on purpose. GitHub's secondary rate limit punishes a burst of
    // concurrent issue creations, and half-filed batches are a worse failure
    // than a slightly slower one.
    for (const draft of drafts) {
      const issueBody = `${draft.body}\n${footer({
        title: meeting.title,
        startsAt: meeting.startsAt,
        quotes: ((draft.quotes as Quote[] | null) ?? []).filter((q) => q?.text),
      })}`;

      try {
        const issue = await createGitHubIssue(installationToken, {
          owner: repo.owner,
          repo: repo.name,
          title: draft.title,
          body: issueBody,
          labels: draft.labels.length ? draft.labels : ["from-call"],
        });

        // A Report row is what an Issue hangs off in this schema, and it is
        // also what makes a call-born issue show up in the same lists as every
        // other one instead of being a second, invisible kind of issue.
        const report = await prisma.report.create({
          data: {
            repoId: repo.id,
            source: "MEETING",
            status: "CREATED",
            rawInput: draft.body,
            reporterPrimaryKey: reporterKey,
            reporterName,
            reporterEmail: session.user.email ?? null,
          },
        });

        await prisma.issue.create({
          data: {
            reportId: report.id,
            repoId: repo.id,
            githubNumber: issue.number,
            githubUrl: issue.url,
            title: draft.title,
            body: issueBody,
            labels: draft.labels,
          },
        });

        await prisma.meetingIssueDraft.update({
          where: { id: draft.id },
          data: { status: "CREATED", githubNumber: issue.number, githubUrl: issue.url },
        });

        created.push({ id: draft.id, number: issue.number, url: issue.url });
      } catch (err) {
        // One bad draft must not sink the batch — the others are still work
        // somebody agreed to file.
        const message = err instanceof Error ? err.message : "GitHub rejected it";
        console.error("[meeting-issues] create failed:", draft.id, message);
        failed.push({ id: draft.id, title: draft.title, error: message });
      }
    }

    return NextResponse.json({ success: true, data: { created, failed } });
  } catch (error) {
    console.error("Meeting draft create error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
