export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { authenticatePlatform, requireTenant } from "@/lib/wa/auth";
import { getOrCreateWallet } from "@/lib/wa/wallet";
import { waOk, waFail } from "@/lib/wa/response";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

/**
 * The ledger, newest first. This is the audit trail a platform shows its tenant
 * when they ask where their recharge went — WaWalletTxn is the truth and the
 * wallet balance is only its rollup, so this endpoint can always explain a
 * balance that looks wrong.
 */
export async function GET(request: Request) {
  try {
    const platform = await authenticatePlatform(request);
    const params = new URL(request.url).searchParams;
    const ownerId = params.get("ownerId");

    const limit = Math.min(Number(params.get("limit")) || DEFAULT_LIMIT, MAX_LIMIT);
    const cursor = params.get("cursor");

    const wallet = ownerId
      ? await getOrCreateWallet("TENANT", (await requireTenant(platform.id, ownerId)).id)
      : await getOrCreateWallet("PLATFORM", platform.id);

    const txns = await prisma.waWalletTxn.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        amountPaise: true,
        kind: true,
        balanceAfterPaise: true,
        messageId: true,
        broadcastId: true,
        note: true,
        createdAt: true,
      },
    });

    const hasMore = txns.length > limit;
    const page = hasMore ? txns.slice(0, limit) : txns;

    return waOk({
      scope: ownerId ? "tenant" : "platform",
      transactions: page,
      nextCursor: hasMore ? page[page.length - 1]?.id : null,
    });
  } catch (err) {
    return waFail(err);
  }
}
