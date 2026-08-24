import type { ExtensionReviewState, StoreExtension } from "@prisma/client";
import { prisma } from "@/lib/db";
import { accessTokenForConnection, fetchItemStatus } from "@/lib/chrome-store";
import { sendExtensionStatusWhatsApp } from "@/lib/whatsapp";

/**
 * Watch Chrome Web Store submissions and say something when they move (#332).
 *
 * The rule that shapes everything here: **a message is only worth sending when
 * a human has something to do, or has been waiting long enough to wonder.** A
 * cron that reports "still in review" every fifteen minutes trains you to
 * ignore it, and then the rejection goes unread too.
 */

/** How long a draft may sit before it stops being "mid-release" and starts being forgotten. */
const DRAFT_NAG_MS = 12 * 60 * 60 * 1000;

/** Same idea for a review that is taking unusually long. Google's own SLA is days, not hours. */
const REVIEW_NAG_MS = 3 * 24 * 60 * 60 * 1000;

interface Notification {
  headline: string;
  detail: string;
}

/**
 * Should this state change reach a phone, and what should it say?
 *
 * Returns null for everything routine — a fresh submission entering review is
 * expected, and saying so is noise.
 */
export function decideNotification(
  row: Pick<StoreExtension, "state" | "notifiedState" | "stateSince" | "stateDetail">,
  next: ExtensionReviewState,
  now = Date.now()
): Notification | null {
  const sinceMs = row.stateSince ? now - row.stateSince.getTime() : 0;
  const changed = next !== row.state;
  const alreadyToldThis = row.notifiedState === next;

  if (next === "NEEDS_ATTENTION") {
    // Always, and again if it changes — this is the one that costs a release.
    if (alreadyToldThis && !changed) return null;
    return {
      headline: "needs your attention",
      detail: row.stateDetail
        ? `Google says: ${row.stateDetail}. Fix it and resubmit.`
        : "Google rejected or removed it. Open the console for the reason and resubmit.",
    };
  }

  if (next === "PUBLISHED" && changed) {
    return { headline: "is published", detail: "Users get it on their next Chrome update." };
  }

  if (next === "DRAFT" && !alreadyToldThis && sinceMs >= DRAFT_NAG_MS) {
    // The silent failure this feature exists for: an upload nobody submitted.
    return {
      headline: "is still a draft",
      detail: "It was uploaded but never submitted for review, so nobody has it yet.",
    };
  }

  if (next === "IN_REVIEW" && !alreadyToldThis && sinceMs >= REVIEW_NAG_MS) {
    return {
      headline: "is still in review",
      detail: "Google has had it for three days. Usually fine, but worth a look.",
    };
  }

  return null;
}

/** Chrome's developer console, deep-linked to the item. */
function consolePath(itemId: string): string {
  return `detail/${itemId}`;
}

async function checkOne(row: StoreExtension): Promise<ExtensionReviewState> {
  const token = await accessTokenForConnection(row.connectionId);
  // A refused connection is recorded on the connection itself, and the reason
  // there ("reconnect") is more useful than repeating it on every extension.
  if (!token) throw new Error("The connected Google account needs reconnecting");

  const status = await fetchItemStatus({
    publisherId: row.publisherId,
    itemId: row.itemId,
    accessToken: token,
  });

  const next = status.state as ExtensionReviewState;
  const changed = next !== row.state;

  const notify = decideNotification(
    { ...row, stateDetail: status.detail ?? row.stateDetail },
    next
  );

  if (notify) {
    const user = await prisma.user.findUnique({
      where: { id: row.userId },
      select: { whatsappPhone: true },
    });

    if (user?.whatsappPhone) {
      await sendExtensionStatusWhatsApp({
        phone: user.whatsappPhone,
        extensionName: row.name,
        version: status.submittedVersion ?? status.publishedVersion ?? "—",
        headline: notify.headline,
        detail: notify.detail,
        consolePath: consolePath(row.itemId),
      });
    } else {
      console.warn(`[extension-watch] ${row.name}: ${notify.headline}, but the owner has no phone`);
    }
  }

  await prisma.storeExtension.update({
    where: { id: row.id },
    data: {
      state: next,
      stateDetail: status.detail,
      publishedVersion: status.publishedVersion,
      submittedVersion: status.submittedVersion,
      // Only move the clock on a real change: a draft that has sat for a week
      // must keep looking a week old, or the nag threshold never fires.
      ...(changed ? { stateSince: new Date() } : {}),
      ...(notify ? { notifiedState: next } : {}),
      lastCheckedAt: new Date(),
      lastError: null,
    },
  });

  return next;
}

interface WatchOutcome {
  checked: number;
  changed: number;
  failed: number;
}

/**
 * Poll every watched extension once.
 *
 * A failure is recorded on its own row and never stops the sweep: one revoked
 * service account must not blind the watcher to every other extension.
 */
export async function watchStoreExtensions(): Promise<WatchOutcome> {
  const rows = await prisma.storeExtension.findMany({ orderBy: { lastCheckedAt: "asc" } });

  let changed = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const next = await checkOne(row);
      if (next !== row.state) changed++;
    } catch (err) {
      failed++;
      const message = err instanceof Error ? err.message : "Could not reach the Chrome Web Store";
      console.error(`[extension-watch] ${row.name}:`, message);
      await prisma.storeExtension.update({
        where: { id: row.id },
        data: { lastCheckedAt: new Date(), lastError: message.slice(0, 500) },
      });
    }
  }

  return { checked: rows.length, changed, failed };
}
