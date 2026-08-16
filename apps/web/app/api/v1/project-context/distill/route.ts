export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { assertRepoAccess } from "@/lib/repo-access";
import { checkRateLimit } from "@/lib/rate-limit";
import { distillManualText, distillSources } from "@/lib/project-context/distill";
import {
  claimSources,
  countUndistilledSourcesByRepo,
  MAX_SOURCES_PER_RUN,
} from "@/lib/project-context/sources";

/**
 * POST /api/v1/project-context/distill
 *
 * The one place distillation is triggered (#311 Phase A). Explicit by design —
 * nothing distills on report ingest, because a Gemini call per inbound bug
 * report is an uncapped bill on a volume we don't control.
 *
 * Body:
 *   { repoId, mode: "manual", text, occurredAt? }  — paste call notes
 *   { repoId, mode: "backfill" }                    — distill this repo's
 *                                                     undistilled reports + QA
 *
 * `repoId` is verified against `lib/repo-access` before anything runs; a
 * client-supplied id is never trusted.
 */

/** Model calls are the cost here, so the limit is per-user and deliberately low. */
const DISTILL_LIMIT_PER_HOUR = 20;

/** Longer than this is a transcript, not notes — Phase C owns that path. */
const MAX_MANUAL_TEXT = 20_000;

export async function POST(request: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      repoId?: string;
      mode?: string;
      text?: string;
      occurredAt?: string;
    };

    if (body.mode !== "manual" && body.mode !== "backfill") {
      return NextResponse.json(
        { success: false, error: "mode must be 'manual' or 'backfill'" },
        { status: 400 }
      );
    }

    const repo = await assertRepoAccess(userId, body.repoId);
    if (!repo) {
      return NextResponse.json(
        { success: false, error: "Repo not found or not accessible" },
        { status: 403 }
      );
    }

    // Charged only once the request is known to be well-formed — a typo'd mode
    // shouldn't burn one of the caller's twenty hourly runs.
    const rate = await checkRateLimit(`distill:${userId}`, DISTILL_LIMIT_PER_HOUR);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Distillation limit reached. Try again after ${rate.resetAt.toISOString()}`,
        },
        { status: 429 }
      );
    }

    if (body.mode === "manual") {
      const text = body.text?.trim() ?? "";
      if (text.length < 20) {
        return NextResponse.json(
          { success: false, error: "Paste some notes first" },
          { status: 400 }
        );
      }
      if (text.length > MAX_MANUAL_TEXT) {
        return NextResponse.json(
          { success: false, error: "Notes too long — split them into smaller pastes" },
          { status: 400 }
        );
      }

      // An unparseable date must not silently become "today" on a row whose
      // whole job is to say when something happened — reject it instead.
      let occurredAt: Date | undefined;
      if (body.occurredAt) {
        const parsed = new Date(body.occurredAt);
        if (Number.isNaN(parsed.getTime())) {
          return NextResponse.json({ success: false, error: "Invalid date" }, { status: 400 });
        }
        occurredAt = parsed;
      }

      const result = await distillManualText({
        repoId: repo.id,
        userId,
        text,
        occurredAt,
      });

      return NextResponse.json({ success: true, data: { ...result, remaining: 0 } });
    }

    // mode === "backfill"
    const sources = await claimSources(repo.id, MAX_SOURCES_PER_RUN);

    const result =
      sources.length > 0
        ? await distillSources({ repoId: repo.id, userId, sources })
        : { sourcesAttempted: 0, sourcesDistilled: 0, itemsCreated: 0, failures: 0 };

    // What's left after this run — the client uses it to decide whether to keep
    // offering the button, so a capped batch never reads as "done".
    const pending = await countUndistilledSourcesByRepo([repo.id]);

    return NextResponse.json({
      success: true,
      data: { ...result, remaining: pending.get(repo.id) ?? 0 },
    });
  } catch (error) {
    console.error("Project context distill error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
