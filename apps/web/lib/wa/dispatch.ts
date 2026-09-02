import { prisma } from "@/lib/db";

/**
 * Does this webhook payload belong to a platform tenant?
 *
 * Meta allows exactly ONE callback URL per app, and this app already serves
 * Glitchgrab's own number at /api/v1/whatsapp/webhook. So a single endpoint has
 * to carry two products' traffic, and the only thing that distinguishes them is
 * `phone_number_id`: every tenant number is a `WaNumber` row, and Glitchgrab's
 * own number is not.
 *
 * Deliberately narrow. A payload we cannot attribute falls through to the legacy
 * handler, because that is the behaviour that existed before this feature and
 * the one that keeps OTP, booking and digest working. Failing towards "not
 * ours" is the safe direction.
 */
export async function isPlatformPayload(payload: unknown): Promise<boolean> {
  const entries = (payload as { entry?: { changes?: { value?: { metadata?: { phone_number_id?: string } } }[] }[] })
    ?.entry;
  if (!Array.isArray(entries)) return false;

  const phoneNumberIds = new Set<string>();
  for (const entry of entries) {
    for (const change of entry.changes ?? []) {
      const id = change.value?.metadata?.phone_number_id;
      if (id) phoneNumberIds.add(id);
    }
  }

  if (phoneNumberIds.size === 0) return false;

  const known = await prisma.waNumber.findFirst({
    where: { phoneNumberId: { in: [...phoneNumberIds] } },
    select: { id: true },
  });

  return !!known;
}
