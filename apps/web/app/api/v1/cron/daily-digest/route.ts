export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { buildDigests, formatBreakdown, formatOwnPlate } from "@/lib/digest";
import { sendDailyIssueDigest } from "@/lib/whatsapp";

/**
 * Morning nudge, 08:00 IST.
 *
 * The successor to `cron/daily-reminder`: same slot, richer message — a per-repo
 * breakdown of where the backlog actually is, plus the recipient's own assigned
 * count in the same message rather than a second one.
 *
 * Inert until `WHATSAPP_DIGEST_ENABLED=true`, because the `daily_issue_digest`
 * template has to clear Meta review first and a template that is not yet Active
 * fails the send outright. That same flag silences the old reminder, so the two
 * can never both fire.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (process.env.WHATSAPP_DIGEST_ENABLED !== "true") {
    return NextResponse.json({ ok: true, skipped: "WHATSAPP_DIGEST_ENABLED not set" });
  }

  const digests = await buildDigests();

  let notified = 0;
  let quiet = 0;

  for (const digest of digests) {
    // Nothing open anywhere and nothing assigned — a "you have 0 issues" ping
    // every morning is how a useful nudge becomes noise people mute for good.
    if (digest.headlineOpen === 0) {
      quiet++;
      continue;
    }

    const sent = await sendDailyIssueDigest({
      phone: digest.phone,
      name: digest.name,
      orgLabel: digest.orgLabel,
      openCount: digest.headlineOpen,
      breakdown: formatBreakdown(digest.repoCounts),
      ownPlate: formatOwnPlate(digest.assignedOpen, digest.githubLinked),
      glitchgrabPath: digest.glitchgrabPath,
    });

    if (sent.ok) notified++;
    else console.error("[daily-digest] send failed for", digest.userId, sent.error);
  }

  return NextResponse.json({ ok: true, notified, quiet, considered: digests.length });
}
