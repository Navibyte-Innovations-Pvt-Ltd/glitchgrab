export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClosedIssueCountSince } from "@/lib/github";
import { getInstallationAccessToken } from "@/lib/github-app";
import { sendWeeklyIssueSummary } from "@/lib/whatsapp";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const developers = await prisma.user.findMany({
    where: { whatsappPhone: { not: null } },
    select: {
      id: true,
      name: true,
      whatsappPhone: true,
      repos: {
        select: { owner: true, name: true, installation: { select: { installationId: true } } },
      },
      ownedOrgs: { select: { name: true, githubOrgLogin: true }, take: 1 },
    },
  });

  let notified = 0;

  for (const dev of developers) {
    if (!dev.whatsappPhone || !dev.repos.length) continue;

    let totalResolved = 0;
    for (const repo of dev.repos) {
      if (!repo.installation) continue;
      const token = await getInstallationAccessToken(repo.installation.installationId);
      totalResolved += await getClosedIssueCountSince(token, repo.owner, repo.name, sevenDaysAgo);
    }

    const orgName = dev.ownedOrgs?.[0]?.name ?? dev.name ?? "your org";
    const orgLogin = dev.ownedOrgs?.[0]?.githubOrgLogin;
    const glitchgrabPath = orgLogin
      ? `org/${orgLogin}?triageAssign=assigned`
      : null;

    await sendWeeklyIssueSummary({
      phone: dev.whatsappPhone,
      developerName: dev.name ?? "Developer",
      resolvedCount: totalResolved,
      orgName,
      glitchgrabPath,
    });
    notified++;
  }

  return NextResponse.json({ ok: true, notified });
}
