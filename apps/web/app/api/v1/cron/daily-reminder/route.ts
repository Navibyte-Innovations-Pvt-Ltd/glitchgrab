export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOpenIssueCount } from "@/lib/github";
import { getInstallationAccessToken } from "@/lib/github-app";
import { sendDailyIssueReminder } from "@/lib/whatsapp";

/**
 * Superseded by `cron/daily-digest`, kept alive until the `daily_issue_digest`
 * template clears Meta review.
 *
 * The flag is the handover switch, and it is a switch rather than a deletion
 * because editing an approved template sends it back into review and it cannot
 * send meanwhile — so the old reminder must keep working until the new one
 * provably does.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (process.env.WHATSAPP_DIGEST_ENABLED === "true") {
    return NextResponse.json({ ok: true, skipped: "superseded by cron/daily-digest" });
  }

  const mutedUsers = await prisma.user.findMany({
    where: { digestMutedUntil: { gt: new Date() } },
    select: { id: true },
  });
  const muted = new Set(mutedUsers.map((u) => u.id));

  const developers = await prisma.user.findMany({
    where: { whatsappPhone: { not: null } },
    select: {
      id: true,
      name: true,
      whatsappPhone: true,
      repos: {
        select: { owner: true, name: true, installation: { select: { installationId: true } } },
        where: { userId: { not: "" } },
      },
      ownedOrgs: { select: { name: true, githubOrgLogin: true }, take: 1 },
    },
  });

  let notified = 0;

  for (const dev of developers) {
    if (!dev.whatsappPhone || !dev.repos.length) continue;
    // A LEAVE reply mutes this one too — the person who said "I am off today"
    // does not care which cron the message came from.
    if (muted.has(dev.id)) continue;

    let totalOpen = 0;
    for (const repo of dev.repos) {
      if (!repo.installation) continue;
      const token = await getInstallationAccessToken(repo.installation.installationId);
      totalOpen += await getOpenIssueCount(token, repo.owner, repo.name);
    }

    if (totalOpen === 0) continue;

    const orgName = dev.ownedOrgs?.[0]?.name ?? dev.name ?? "your org";
    const orgLogin = dev.ownedOrgs?.[0]?.githubOrgLogin;
    const glitchgrabPath = orgLogin
      ? `org/${orgLogin}?triageAssign=assigned`
      : null;

    await sendDailyIssueReminder({
      phone: dev.whatsappPhone,
      developerName: dev.name ?? "Developer",
      openCount: totalOpen,
      orgName,
      glitchgrabPath,
    });
    notified++;
  }

  return NextResponse.json({ ok: true, notified });
}
