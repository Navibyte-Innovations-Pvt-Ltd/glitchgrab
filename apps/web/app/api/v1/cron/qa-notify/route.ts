export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendTesterQaRequest } from "@/lib/whatsapp";

const DEPLOY_DELAY_MS = 10 * 60 * 1000;

/**
 * GET /api/v1/cron/qa-notify
 *
 * QaCheck rows are created the instant a PR merges (see github/webhook route),
 * but the fix isn't actually live yet — Vercel needs a few minutes to build
 * and promote the deploy. This sweeps rows old enough that the deploy should
 * be live and sends the tester's WhatsApp verification request then.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const due = await prisma.qaCheck.findMany({
    where: {
      notifiedAt: null,
      createdAt: { lte: new Date(Date.now() - DEPLOY_DELAY_MS) },
    },
    select: {
      id: true,
      testerId: true,
      repoId: true,
      prNumber: true,
      developerLogin: true,
      tester: { select: { name: true, phone: true, magicToken: true } },
      repo: { select: { userId: true, orgId: true } },
    },
  });

  // One WhatsApp per tester per PR — never one per issue.
  const groups = new Map<string, (typeof due)[number][]>();
  for (const row of due) {
    const key = `${row.testerId}:${row.repoId}:${row.prNumber ?? "none"}`;
    const group = groups.get(key);
    if (group) group.push(row);
    else groups.set(key, [row]);
  }

  let notified = 0;

  for (const group of groups.values()) {
    const first = group[0];
    const tester = first.tester;
    if (!tester.phone) continue;

    const [ownerData, devUser] = await Promise.all([
      prisma.user.findUnique({
        where: { id: first.repo.userId },
        select: {
          name: true,
          ownedOrgs: { where: { id: first.repo.orgId ?? "" }, select: { name: true }, take: 1 },
        },
      }),
      first.developerLogin
        ? prisma.user.findFirst({
            where: { githubLogin: first.developerLogin },
            select: { name: true },
          })
        : Promise.resolve(null),
    ]);
    const orgName = ownerData?.ownedOrgs?.[0]?.name ?? ownerData?.name ?? "the team";
    const developerName = devUser?.name ?? first.developerLogin ?? "the developer";

    await sendTesterQaRequest({
      phone: tester.phone,
      testerName: tester.name,
      developerName,
      issueCount: group.length,
      orgName,
      magicToken: tester.magicToken,
    });

    await prisma.qaCheck.updateMany({
      where: { id: { in: group.map((r) => r.id) } },
      data: { notifiedAt: new Date() },
    });
    notified++;
  }

  return NextResponse.json({ ok: true, notified });
}
