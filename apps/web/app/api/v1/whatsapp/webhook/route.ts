export const dynamic = "force-dynamic";

import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { qaLink } from "@/lib/qa";
import { reopenGitHubIssue } from "@/lib/github";
import { getInstallationAccessToken } from "@/lib/github-app";
import { sendDeveloperReopenedNotification, sendWhatsappCtaUrl, sendWhatsappText } from "@/lib/whatsapp";
import { muteDigestByPhone, unmuteDigestByPhone } from "@/lib/digest";
import { handleBookingAction, handleBookingMessage } from "@/lib/whatsapp-booking";

/**
 * Does this button tap mean "move my demo" or "call it off"?
 *
 * Matched on the label because a template quick reply carries no payload of its
 * own. Loose on purpose — case, spacing and any surrounding punctuation vary
 * between the template button and the picker rows — but anchored on the two
 * words so an unrelated button never cancels a client call.
 */
function bookingAction(text: string): "reschedule" | "cancel" | null {
  const t = text.trim().toLowerCase();
  if (/^reschedule\b/.test(t)) return "reschedule";
  if (/^cancel\b/.test(t)) return "cancel";
  return null;
}

/**
 * "please don't message me today i am on leave" — issue #322, verbatim.
 *
 * Matched loosely on intent rather than an exact keyword because nobody types
 * the keyword. Deliberately anchored on phrases that can only mean "stop
 * messaging me": a bare "no" or "later" is left alone so a booking reply is
 * never mistaken for a mute.
 */
const LEAVE_INTENT =
  /^(leave|off|mute|dnd|stop)\b|\b(on leave|day off|days off|holiday|don'?t message|do not message|dont message|no messages?|not today|skip today)\b/i;

/** The way back — only ever acted on for someone who is currently muted. */
const RESUME_INTENT = /^(resume|unmute|back|i'?m back|im back|working)\b/i;

/**
 * A mute request, however it arrived, and the reply that confirms it.
 *
 * Free text rather than a template: the person just messaged us, which opens
 * Meta's 24-hour service window. Returns true when it handled the message so
 * the caller stops — a "don't message me" that then falls through to the
 * booking script and gets answered with a slot picker is the exact failure this
 * guards against.
 */
async function handleDigestMute(phone: string, text: string): Promise<boolean> {
  const trimmed = text.trim();

  if (RESUME_INTENT.test(trimmed)) {
    const name = await unmuteDigestByPhone(phone);
    if (!name) return false;
    await sendWhatsappText(phone, `Welcome back ${name} 👋 Daily updates are on again.`);
    return true;
  }

  if (!LEAVE_INTENT.test(trimmed)) return false;

  const muted = await muteDigestByPhone(phone);
  if (!muted) return false;

  // Says plainly that this lasts a day, because "STOP" is in the intent list and
  // people type it meaning "never again". Better to name the limit and point at
  // the real off switch than to quietly mute for a day and be typed at again.
  await sendWhatsappText(
    phone,
    `Got it ${muted.name} — no more issue updates today. Enjoy the break 🌴\n\nThey come back tomorrow; reply RESUME to turn them on sooner, or remove your number in Glitchgrab → Settings → WhatsApp to stop them for good.`
  );
  return true;
}

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
              text?: { body: string };
              interactive?: {
                type: string;
                list_reply?: { id: string; title: string };
                button_reply?: { id: string; title: string };
              };
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
      // Template quick-reply taps (issue resolved yes/no) — unchanged.
      if (message.type === "button" && message.button?.payload?.startsWith("gg_")) {
        const { payload: btnPayload } = message.button;
        if (btnPayload.startsWith("gg_no_")) {
          const issueId = btnPayload.slice("gg_no_".length);
          await handleReporterSaidNo(issueId);
        }
        // "gg_yes_" → no action needed
        continue;
      }

      // Reschedule / Cancel on a booking template.
      //
      // Read from every field the tap might arrive in. A template quick reply
      // has no custom payload, so Meta echoes the button's own label — but
      // which field carries it differs between a template button and an
      // interactive reply button, and a wrong guess here fails SILENTLY: the
      // loop would simply find nothing to do and answer 200.
      const tapped =
        message.button?.payload ??
        message.button?.text ??
        message.interactive?.button_reply?.id ??
        message.interactive?.button_reply?.title ??
        "";
      // A quick-reply tap that means "mute me" — checked before the booking
      // actions because a template button echoes its own LABEL, and a label the
      // booking matcher does not recognise otherwise falls through silently.
      if (tapped && (await handleDigestMute(message.from, tapped))) continue;

      const action = bookingAction(tapped);
      if (action) {
        await handleBookingAction({ phone: message.from, action });
        continue;
      }

      // An interactive reply button that is not a booking action — the cancel
      // confirmation's own Yes/Keep buttons carry ids the booking script owns.
      if (message.type === "interactive" && message.interactive?.button_reply?.id) {
        await handleBookingMessage({
          phone: message.from,
          listReplyId: message.interactive.button_reply.id,
        });
        continue;
      }

      // Demo booking: someone typed to us, or tapped a row in a picker we sent.
      //
      // Awaited rather than fired and forgotten — an un-awaited fetch in a
      // route handler is killed the moment the response is sent, and the reply
      // would silently never leave. Meta retries on a non-200, so failing loudly
      // here is safer than answering 200 having done nothing.
      if (message.type === "text" && message.text?.body) {
        // "I'm on leave, don't message me today" — first, because both handlers
        // below would happily answer it with something else.
        if (await handleDigestMute(message.from, message.text.body)) continue;

        // A registered tester saying hi gets a sign-in link, not the demo
        // booking script. Checked first and gated on BOTH the sender being a
        // known tester AND the text reading as a login intent, so a tester who
        // genuinely wants to book a demo still falls through below.
        if (await handleTesterLoginRequest({ phone: message.from, text: message.text.body })) {
          continue;
        }
        await handleBookingMessage({ phone: message.from, text: message.text.body });
        continue;
      }

      if (message.type === "interactive" && message.interactive?.list_reply?.id) {
        await handleBookingMessage({
          phone: message.from,
          listReplyId: message.interactive.list_reply.id,
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[whatsapp-webhook] error:", err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}

/**
 * "hi" from a tester → a one-tap sign-in link.
 *
 * The tester's magic token is a capability: whoever holds it is that tester. It
 * is only ever sent to the number the admin registered, and only in reply to a
 * message from that same number — an inbound message is what opens Meta's 24h
 * window, so this reply is free text and needs no template.
 *
 * Returns true when it handled the message, so the caller skips the booking
 * script. A phone that is not a tester, or a tester writing something that is
 * not a login request, returns false and falls through untouched.
 */
const LOGIN_INTENT = /^(hi|hii+|hey|hello|login|log in|signin|sign in|start|qa|test|verify)\b/i;

async function handleTesterLoginRequest({
  phone,
  text,
}: {
  phone: string;
  text: string;
}): Promise<boolean> {
  const trimmed = text.trim();
  if (!LOGIN_INTENT.test(trimmed)) return false;

  const cleaned = phone.replace(/\D/g, "");
  // Match on the last 10 digits so a stored "9370928324" still matches an
  // inbound "919370928324" — Meta always sends the country code, admins rarely
  // type one.
  const tail = cleaned.slice(-10);
  if (tail.length !== 10) return false;

  const tester = await prisma.tester.findFirst({
    where: { phone: { endsWith: tail } },
    select: { name: true, magicToken: true, org: { select: { name: true } } },
  });
  if (!tester) return false;

  const sent = await sendWhatsappCtaUrl({
    phone: cleaned,
    body: `Hi ${tester.name} 👋\n\nTap below to open your Glitchgrab QA dashboard for ${tester.org.name}. The link signs you in — no password, no code.`,
    buttonText: "Open dashboard",
    url: qaLink(tester.magicToken),
    footer: "Glitchgrab QA",
  });
  if (!sent.ok) {
    console.error("[whatsapp-webhook] tester login link failed:", sent.error);
  }
  return true;
}

async function handleReporterSaidNo(issueId: string) {
  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    include: {
      report: { select: { reporterName: true, reporterPhone: true } },
      repo: {
        select: {
          owner: true,
          name: true,
          userId: true,
          orgId: true,
          installation: { select: { installationId: true } },
        },
      },
    },
  });

  if (!issue) {
    console.warn("[whatsapp-webhook] issue not found:", issueId);
    return;
  }

  const { owner, name: repoName, userId, installation } = issue.repo;

  if (!installation) {
    console.warn("[whatsapp-webhook] GitHub App not installed for repo owner:", owner);
    return;
  }

  const token = await getInstallationAccessToken(installation.installationId);

  try {
    await reopenGitHubIssue(token, owner, repoName, issue.githubNumber);
  } catch (err) {
    console.warn("[whatsapp-webhook] reopen attempt 1 failed, retrying:", err);
    try {
      await reopenGitHubIssue(token, owner, repoName, issue.githubNumber);
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
