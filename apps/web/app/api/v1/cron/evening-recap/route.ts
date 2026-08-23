export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { buildDigests, startOfIstDay } from "@/lib/digest";
import { sendEveningRecap } from "@/lib/whatsapp";

/**
 * Evening wrap, 19:00 IST — what actually got closed today.
 *
 * Deliberately silent on a day where nothing closed. A nightly "0 issues closed
 * today" is a guilt message, not a recap, and the fastest way to get the whole
 * digest muted permanently.
 *
 * Gated on the same `WHATSAPP_DIGEST_ENABLED` flag as the morning digest: the
 * `evening_recap` template must be Active in Meta before either can send.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (process.env.WHATSAPP_DIGEST_ENABLED !== "true") {
    return NextResponse.json({ ok: true, skipped: "WHATSAPP_DIGEST_ENABLED not set" });
  }

  const digests = await buildDigests({ closedSince: startOfIstDay() });

  let notified = 0;
  let quiet = 0;

  for (const digest of digests) {
    if (digest.closedInWindow === 0) {
      quiet++;
      continue;
    }

    const sent = await sendEveningRecap({
      phone: digest.phone,
      name: digest.name,
      closedCount: digest.closedInWindow,
      orgLabel: digest.orgLabel,
      openCount: digest.headlineOpen,
      assignedCount: digest.assignedOpen,
      glitchgrabPath: digest.glitchgrabPath,
    });

    if (sent.ok) notified++;
    else console.error("[evening-recap] send failed for", digest.userId, sent.error);
  }

  return NextResponse.json({ ok: true, notified, quiet, considered: digests.length });
}
