export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { authenticatePlatform, resolveTenant } from "@/lib/wa/auth";
import { credit } from "@/lib/wa/wallet";
import { WaError } from "@/lib/wa/errors";
import { waOk, waFail } from "@/lib/wa/response";

/**
 * Adds balance to a wallet.
 *
 * With `ownerId` → credits that tenant, after the platform has collected the
 * money on its own rails. We move a number; we never hold the tenant's rupees.
 * Custodying end-customer funds would make us a payment aggregator under RBI,
 * which is a licence we do not have and do not want.
 *
 * Without `ownerId` → credits the platform's own wallet (a top-up to us).
 * That one IS real money, from a party we have a contract with.
 */
export async function POST(request: Request) {
  try {
    const platform = await authenticatePlatform(request);
    const body = (await request.json()) as {
      ownerId?: string;
      ownerName?: string;
      amountPaise?: number;
      refKey?: string;
      note?: string;
    };

    const amountPaise = body.amountPaise;
    if (typeof amountPaise !== "number" || !Number.isInteger(amountPaise) || amountPaise <= 0) {
      throw new WaError("INVALID_AMOUNT", "amountPaise must be a positive integer", 400);
    }

    if (body.ownerId) {
      const tenant = await resolveTenant(platform.id, body.ownerId, body.ownerName);
      const balance = await credit({
        ownerType: "TENANT",
        ownerId: tenant.id,
        amountPaise,
        refKey: body.refKey,
        note: body.note,
      });
      return waOk({ scope: "tenant", ownerId: body.ownerId, ...balance });
    }

    const balance = await credit({
      ownerType: "PLATFORM",
      ownerId: platform.id,
      amountPaise,
      refKey: body.refKey,
      note: body.note,
    });

    // A top-up clears the low-balance flag so the next dip notifies again.
    await prisma.waWallet.updateMany({
      where: { ownerType: "PLATFORM", ownerId: platform.id },
      data: { lowBalanceNotifiedAt: null },
    });

    return waOk({ scope: "platform", ...balance });
  } catch (err) {
    return waFail(err);
  }
}
