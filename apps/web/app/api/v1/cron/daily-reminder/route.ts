export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOpenIssueCount } from "@/lib/github";
import { sendDailyIssueReminder } from "@/lib/whatsapp";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const developers = await prisma.user.findMany({
    where: { whatsappPhone: { not: null } },
    select: {
      id: true,
      name: true,
      whatsappPhone: true,
      repos: { select: { owner: true, name: true }, where: { userId: { not: "" } } },
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

    let totalOpen = 0;
    for (const repo of dev.repos) {
      totalOpen += await getOpenIssueCount(account.access_token, repo.owner, repo.name);
    }

    if (totalOpen === 0) continue;

    const orgName = dev.ownedOrgs?.[0]?.name ?? dev.name ?? "your org";
    await sendDailyIssueReminder({
      phone: dev.whatsappPhone,
      developerName: dev.name ?? "Developer",
      openCount: totalOpen,
      orgName,
    });
    notified++;
  }

  return NextResponse.json({ ok: true, notified });
}
