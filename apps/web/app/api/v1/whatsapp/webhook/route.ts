export const dynamic = "force-dynamic";

import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { reopenGitHubIssue } from "@/lib/github";
import { sendDeveloperReopenedNotification } from "@/lib/whatsapp";

function verifySignature(body: string, signature: string | null): boolean {
  const appSecret = process.env.META_WA_APP_SECRET;
  if (!appSecret) {
    console.error("[whatsapp-webhook] META_WA_APP_SECRET not configured, rejecting request");
    return false;
  }
  if (!signature) return false;
  const expected = `sha256=${createHmac("sha256", appSecret).update(body).digest("hex")}`;
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * GET /api/v1/whatsapp/webhook
 * Meta webhook verification handshake.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.META_WA_VERIFY_TOKEN) {
    return new Response(challenge ?? "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

/**
 * POST /api/v1/whatsapp/webhook
 * Receives button tap events from Meta (reporter tapped Yes or No).
 * Template quick-reply taps arrive as message.type === "button" with message.button.payload.
 */
export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get("x-hub-signature-256");

    if (!verifySignature(body, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(body) as {
      entry?: Array<{
        changes?: Array<{
          value?: {
            messages?: Array<{
              from: string;
              type: string;
              button?: { payload: string; text: string };
            }>;
            statuses?: Array<{
              id: string;
              status: string;
              recipient_id: string;
              errors?: Array<{ code: number; title: string; message: string }>;
            }>;
          };
        }>;
      }>;
    };

    const messages = payload.entry?.[0]?.changes?.[0]?.value?.messages ?? [];
    const statuses = payload.entry?.[0]?.changes?.[0]?.value?.statuses ?? [];

    for (const status of statuses) {
      if (status.status === "failed") {
        console.error(
          "[whatsapp-webhook] delivery failed:",
          JSON.stringify({ recipient: status.recipient_id, errors: status.errors })
        );
      }
    }

    for (const message of messages) {
      if (message.type !== "button" || !message.button?.payload) continue;

      const { payload: btnPayload } = message.button;

      if (btnPayload.startsWith("gg_no_")) {
        const issueId = btnPayload.slice("gg_no_".length);
        await handleReporterSaidNo(issueId);
      }
      // "gg_yes_" → no action needed
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[whatsapp-webhook] error:", err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}

async function handleReporterSaidNo(issueId: string) {
  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    include: {
      report: { select: { reporterName: true, reporterPhone: true } },
      repo: { select: { owner: true, name: true, userId: true, orgId: true } },
    },
  });

  if (!issue) {
    console.warn("[whatsapp-webhook] issue not found:", issueId);
    return;
  }

  const { owner, name: repoName, userId } = issue.repo;

  // Get repo owner's GitHub token
  const account = await prisma.account.findFirst({
    where: { userId, provider: "github" },
    select: { access_token: true, expires_at: true },
  });

  if (!account?.access_token) {
    console.warn("[whatsapp-webhook] no GitHub token for user:", userId);
    return;
  }

  if (account.expires_at && account.expires_at < Math.floor(Date.now() / 1000)) {
    console.warn("[whatsapp-webhook] GitHub token may be expired for user:", userId);
  }

  try {
    await reopenGitHubIssue(account.access_token, owner, repoName, issue.githubNumber);
  } catch (err) {
    console.warn("[whatsapp-webhook] reopen attempt 1 failed, retrying:", err);
    try {
      await reopenGitHubIssue(account.access_token, owner, repoName, issue.githubNumber);
    } catch (retryErr) {
      console.error(
        `[whatsapp-webhook] reopen failed for issue ${issueId} (${owner}/${repoName}#${issue.githubNumber}):`,
        retryErr
      );
      return;
    }
  }

  // Notify developer via WhatsApp
  const devUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      whatsappPhone: true,
      ownedOrgs: { where: { id: issue.repo.orgId ?? "" }, select: { name: true }, take: 1 },
    },
  });

  const orgName = devUser?.ownedOrgs?.[0]?.name ?? devUser?.name ?? "the team";

  if (devUser?.whatsappPhone) {
    await sendDeveloperReopenedNotification({
      phone: devUser.whatsappPhone,
      reporterName: issue.report?.reporterName ?? "Reporter",
      reporterPhone: issue.report?.reporterPhone,
      issueTitle: issue.title,
      orgName,
      githubUrl: issue.githubUrl,
    });
  }
}
