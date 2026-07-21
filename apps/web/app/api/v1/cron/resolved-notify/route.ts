export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendIssueResolvedWhatsApp } from "@/lib/whatsapp";

const DEPLOY_DELAY_MS = 10 * 60 * 1000;

/**
 * GET /api/v1/cron/resolved-notify
 *
 * Issue.resolvedAt is set the instant GitHub reports the issue closed (see
 * github/webhook route), but the fix isn't actually live yet — Vercel needs
 * a few minutes to build and promote the deploy. This sweeps issues old
 * enough that the deploy should be live and sends the reporter's WhatsApp
 * "resolved" message then. Reopening the issue before this fires clears
 * resolvedAt, cancelling the pending notify.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const due = await prisma.issue.findMany({
    where: {
      resolvedNotifiedAt: null,
      resolvedAt: { not: null, lte: new Date(Date.now() - DEPLOY_DELAY_MS) },
    },
    select: {
      id: true,
      githubNumber: true,
      title: true,
      repo: {
        select: {
          userId: true,
          orgId: true,
          user: {
            select: {
              name: true,
              whatsappPhone: true,
              ownedOrgs: { select: { id: true, name: true } },
            },
          },
        },
      },
      report: { select: { reporterPhone: true, reporterName: true } },
    },
  });

  let notified = 0;

  for (const issue of due) {
    const phone = issue.report?.reporterPhone;
    if (!phone) {
      // No reporter phone to notify — mark done so it doesn't get swept again.
      await prisma.issue.update({ where: { id: issue.id }, data: { resolvedNotifiedAt: new Date() } });
      continue;
    }

    const owner = issue.repo.user;
    const org = owner?.ownedOrgs.find((o) => o.id === issue.repo.orgId);
    const orgName = org?.name ?? owner?.name ?? "the team";

    await sendIssueResolvedWhatsApp({
      phone,
      reporterName: issue.report?.reporterName ?? "there",
      issueTitle: `#${issue.githubNumber} ${issue.title}`,
      orgName,
      developerPhone: owner?.whatsappPhone,
      issueId: issue.id,
    });

    await prisma.issue.update({ where: { id: issue.id }, data: { resolvedNotifiedAt: new Date() } });
    notified++;
  }

  return NextResponse.json({ ok: true, notified });
}
