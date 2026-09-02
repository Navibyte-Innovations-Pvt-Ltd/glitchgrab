import { Prisma, type WaWalletOwnerType, type WaWalletTxnKind } from "@prisma/client";
import { prisma } from "@/lib/db";
import { WaError, insufficientFunds } from "./errors";

/**
 * Prepaid wallets — recharge first, then send. Nothing is invoiced in arrears.
 *
 * Two rules govern every function here:
 *
 *  1. Money is integer paise. Never a float, never rupees. A float rounding
 *     error on a per-message ledger compounds into a real number fast.
 *  2. A balance is NEVER read and then written. Concurrent sends would both
 *     pass the check and both debit. Every movement is a single conditional
 *     UPDATE whose WHERE clause IS the check, and zero rows affected means the
 *     money was not there.
 *
 * `balancePaise` is a cached rollup; WaWalletTxn is the truth.
 */

type Tx = Prisma.TransactionClient;

export interface WalletBalance {
  balancePaise: number;
  heldPaise: number;
  /** What can actually be spent right now — holds from in-flight broadcasts are excluded. */
  spendablePaise: number;
}

export async function getOrCreateWallet(
  ownerType: WaWalletOwnerType,
  ownerId: string,
  client: Tx | typeof prisma = prisma
): Promise<{ id: string }> {
  return client.waWallet.upsert({
    where: { ownerType_ownerId: { ownerType, ownerId } },
    create: { ownerType, ownerId },
    update: {},
    select: { id: true },
  });
}

export async function getBalance(
  ownerType: WaWalletOwnerType,
  ownerId: string
): Promise<WalletBalance> {
  const wallet = await prisma.waWallet.findUnique({
    where: { ownerType_ownerId: { ownerType, ownerId } },
    select: { balancePaise: true, heldPaise: true },
  });

  const balancePaise = wallet?.balancePaise ?? 0;
  const heldPaise = wallet?.heldPaise ?? 0;
  return { balancePaise, heldPaise, spendablePaise: balancePaise - heldPaise };
}

/**
 * Adds money. Used for a platform top-up, and for a platform crediting one of
 * its tenants after collecting payment on its own rails.
 *
 * We deliberately do not touch the tenant's actual rupees — see the
 * ledger-not-custody note in agent_docs/whatsapp-platform.md.
 */
export async function credit(params: {
  ownerType: WaWalletOwnerType;
  ownerId: string;
  amountPaise: number;
  kind?: Extract<WaWalletTxnKind, "TOPUP" | "REFUND" | "ADJUSTMENT">;
  refKey?: string;
  messageId?: string;
  note?: string;
}): Promise<WalletBalance> {
  const { ownerType, ownerId, amountPaise, kind = "TOPUP", refKey, messageId, note } = params;

  if (!Number.isInteger(amountPaise) || amountPaise <= 0) {
    throw new WaError("INVALID_AMOUNT", "amountPaise must be a positive integer", 400);
  }

  return prisma.$transaction(async (tx) => {
    // Resolve the wallet FIRST. The idempotency lookup must be scoped to it:
    // platforms choose their own refKeys, so an unscoped lookup would let one
    // platform's "topup-1" match another's and read back a foreign balance.
    const wallet = await getOrCreateWallet(ownerType, ownerId, tx);

    if (refKey) {
      const seen = await tx.waWalletTxn.findFirst({
        where: { walletId: wallet.id, refKey },
        select: { id: true },
      });
      // Replaying a top-up must not add the money twice.
      if (seen) {
        const w = await tx.waWallet.findUniqueOrThrow({
          where: { id: wallet.id },
          select: { balancePaise: true, heldPaise: true },
        });
        return { ...w, spendablePaise: w.balancePaise - w.heldPaise };
      }
    }

    const updated = await tx.waWallet.update({
      where: { id: wallet.id },
      data: { balancePaise: { increment: amountPaise } },
      select: { balancePaise: true, heldPaise: true },
    });

    await tx.waWalletTxn.create({
      data: {
        walletId: wallet.id,
        amountPaise,
        kind,
        balanceAfterPaise: updated.balancePaise,
        refKey,
        messageId,
        note,
      },
    });

    return { ...updated, spendablePaise: updated.balancePaise - updated.heldPaise };
  });
}

/**
 * The conditional debit. Returns the new balance, or null when the wallet did
 * not have the money — the WHERE clause is the balance check, so there is no
 * window between checking and spending.
 */
async function debitIfFunded(tx: Tx, walletId: string, amountPaise: number): Promise<number | null> {
  const rows = await tx.$queryRaw<{ balancePaise: number }[]>`
    UPDATE "WaWallet"
       SET "balancePaise" = "balancePaise" - ${amountPaise},
           "updatedAt"    = NOW()
     WHERE "id" = ${walletId}
       AND ("balancePaise" - "heldPaise") >= ${amountPaise}
    RETURNING "balancePaise"
  `;
  return rows[0]?.balancePaise ?? null;
}

export interface ChargeResult {
  tenantBalancePaise: number;
  platformBalancePaise: number;
  tenantPricePaise: number;
  platformPricePaise: number;
}

/**
 * Charges one message against BOTH levels in a single transaction: the tenant
 * at the platform's sell price, the platform at ours. Either side short means
 * neither is debited and the send does not happen.
 *
 * `refKey` makes the whole thing idempotent — a retried send reuses it and the
 * unique index on WaWalletTxn.refKey turns the second attempt into a no-op
 * rather than a double charge.
 */
export async function chargeMessage(params: {
  platformId: string;
  tenantId: string;
  tenantPricePaise: number;
  platformPricePaise: number;
  refKey: string;
  messageId?: string;
}): Promise<ChargeResult> {
  const { platformId, tenantId, tenantPricePaise, platformPricePaise, refKey, messageId } = params;

  return prisma.$transaction(async (tx) => {
    const tenantWallet = await getOrCreateWallet("TENANT", tenantId, tx);
    const platformWallet = await getOrCreateWallet("PLATFORM", platformId, tx);

    // Scoped to the wallet, for the same reason as credit(): a refKey is the
    // caller's string, not a global identifier, and two platforms will collide.
    const already = await tx.waWalletTxn.findFirst({
      where: { walletId: tenantWallet.id, refKey: `${refKey}:tenant` },
      select: { balanceAfterPaise: true },
    });
    if (already) {
      const platformTxn = await tx.waWalletTxn.findFirst({
        where: { walletId: platformWallet.id, refKey: `${refKey}:platform` },
        select: { balanceAfterPaise: true },
      });
      return {
        tenantBalancePaise: already.balanceAfterPaise,
        platformBalancePaise: platformTxn?.balanceAfterPaise ?? 0,
        tenantPricePaise,
        platformPricePaise,
      };
    }

    const tenantBalance = await debitIfFunded(tx, tenantWallet.id, tenantPricePaise);
    if (tenantBalance === null) {
      const w = await tx.waWallet.findUniqueOrThrow({
        where: { id: tenantWallet.id },
        select: { balancePaise: true, heldPaise: true },
      });
      throw insufficientFunds("tenant", tenantPricePaise, w.balancePaise - w.heldPaise);
    }

    const platformBalance = await debitIfFunded(tx, platformWallet.id, platformPricePaise);
    if (platformBalance === null) {
      const w = await tx.waWallet.findUniqueOrThrow({
        where: { id: platformWallet.id },
        select: { balancePaise: true, heldPaise: true },
      });
      // Throwing rolls back the tenant debit above — that is the point of the transaction.
      throw insufficientFunds("platform", platformPricePaise, w.balancePaise - w.heldPaise);
    }

    await tx.waWalletTxn.createMany({
      data: [
        {
          walletId: tenantWallet.id,
          amountPaise: -tenantPricePaise,
          kind: "DEBIT",
          balanceAfterPaise: tenantBalance,
          refKey: `${refKey}:tenant`,
          messageId,
        },
        {
          walletId: platformWallet.id,
          amountPaise: -platformPricePaise,
          kind: "DEBIT",
          balanceAfterPaise: platformBalance,
          refKey: `${refKey}:platform`,
          messageId,
        },
      ],
    });

    return {
      tenantBalancePaise: tenantBalance,
      platformBalancePaise: platformBalance,
      tenantPricePaise,
      platformPricePaise,
    };
  });
}

/**
 * Reserves funds for an in-flight broadcast so a 10,000-recipient send cannot
 * run dry at recipient 6,000. Increases `heldPaise` without moving the balance;
 * spendable drops immediately, so a concurrent single send sees the reservation.
 */
export async function holdFunds(params: {
  ownerType: WaWalletOwnerType;
  ownerId: string;
  amountPaise: number;
  broadcastId: string;
}): Promise<void> {
  const { ownerType, ownerId, amountPaise, broadcastId } = params;

  await prisma.$transaction(async (tx) => {
    const wallet = await getOrCreateWallet(ownerType, ownerId, tx);

    const rows = await tx.$queryRaw<{ balancePaise: number }[]>`
      UPDATE "WaWallet"
         SET "heldPaise" = "heldPaise" + ${amountPaise},
             "updatedAt" = NOW()
       WHERE "id" = ${wallet.id}
         AND ("balancePaise" - "heldPaise") >= ${amountPaise}
      RETURNING "balancePaise"
    `;

    if (!rows[0]) {
      const w = await tx.waWallet.findUniqueOrThrow({
        where: { id: wallet.id },
        select: { balancePaise: true, heldPaise: true },
      });
      throw insufficientFunds(
        ownerType === "TENANT" ? "tenant" : "platform",
        amountPaise,
        w.balancePaise - w.heldPaise
      );
    }

    await tx.waWalletTxn.create({
      data: {
        walletId: wallet.id,
        amountPaise: -amountPaise,
        kind: "HOLD",
        balanceAfterPaise: rows[0].balancePaise,
        broadcastId,
        note: "Reserved for broadcast",
      },
    });
  });
}

/**
 * Settles a hold once a broadcast finishes: `spentPaise` leaves the balance for
 * real, the rest of the reservation is released. A broadcast that sent fewer
 * messages than estimated gives the difference back.
 */
export async function settleHold(params: {
  ownerType: WaWalletOwnerType;
  ownerId: string;
  heldPaise: number;
  spentPaise: number;
  broadcastId: string;
}): Promise<void> {
  const { ownerType, ownerId, heldPaise, spentPaise, broadcastId } = params;

  if (spentPaise > heldPaise) {
    throw new WaError("INVALID_AMOUNT", "Cannot settle more than was held", 400);
  }

  await prisma.$transaction(async (tx) => {
    const wallet = await getOrCreateWallet(ownerType, ownerId, tx);

    const rows = await tx.$queryRaw<{ balancePaise: number }[]>`
      UPDATE "WaWallet"
         SET "heldPaise"    = "heldPaise" - ${heldPaise},
             "balancePaise" = "balancePaise" - ${spentPaise},
             "updatedAt"    = NOW()
       WHERE "id" = ${wallet.id}
         AND "heldPaise" >= ${heldPaise}
      RETURNING "balancePaise"
    `;

    if (!rows[0]) throw new WaError("INVALID_AMOUNT", "Hold no longer exists", 409);

    await tx.waWalletTxn.createMany({
      data: [
        {
          walletId: wallet.id,
          amountPaise: heldPaise,
          kind: "RELEASE",
          balanceAfterPaise: rows[0].balancePaise,
          broadcastId,
          note: "Released broadcast reservation",
        },
        {
          walletId: wallet.id,
          amountPaise: -spentPaise,
          kind: "DEBIT",
          balanceAfterPaise: rows[0].balancePaise,
          broadcastId,
          note: "Broadcast actual spend",
        },
      ],
    });
  });
}

/**
 * Gives money back for a message that was debited and then failed at Meta —
 * bad number, paused template, quality block. The ledger is append-only, so a
 * refund is a new row, never an edit of the debit.
 */
export async function refund(params: {
  ownerType: WaWalletOwnerType;
  ownerId: string;
  amountPaise: number;
  refKey: string;
  messageId?: string;
  note?: string;
}): Promise<void> {
  await credit({
    ownerType: params.ownerType,
    ownerId: params.ownerId,
    amountPaise: params.amountPaise,
    kind: "REFUND",
    refKey: params.refKey,
    messageId: params.messageId,
    note: params.note ?? "Refund for undelivered message",
  });
}
