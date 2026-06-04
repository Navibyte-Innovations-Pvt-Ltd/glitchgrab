export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClosedIssueCountSince } from "@/lib/github";
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
      repos: { select: { owner: true, name: true } },
      ownedOrgs: { select: { name: true }, take: 1 },
    },
  });

  let notified = 0;

  for (const dev of developers) {
    if (!dev.whatsappPhone || !dev.repos.length) continue;

    const account = await prisma.account.findFirst({
      where: { userId: dev.id, provider: "github" },
      select: { access_token: true },
    });
    if (!account?.access_token) continue;

    let totalResolved = 0;
    for (const repo of dev.repos) {
      totalResolved += await getClosedIssueCountSince(
        account.access_token,
        repo.owner,
        repo.name,
        sevenDaysAgo
      );
    }

    const orgName = dev.ownedOrgs?.[0]?.name ?? dev.name ?? "your org";
    await sendWeeklyIssueSummary({
      phone: dev.whatsappPhone,
      developerName: dev.name ?? "Developer",
      resolvedCount: totalResolved,
      orgName,
    });
    notified++;
  }

  return NextResponse.json({ ok: true, notified });
}
