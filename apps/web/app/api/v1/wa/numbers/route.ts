export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { authenticatePlatform, requireTenant } from "@/lib/wa/auth";
import { refreshTenantNumbers } from "@/lib/wa/onboarding";
import { WaError } from "@/lib/wa/errors";
import { waOk, waFail } from "@/lib/wa/response";

/** The tenant's numbers as we last saw them. `?refresh=true` re-reads from Meta. */
export async function GET(request: Request) {
  try {
    const platform = await authenticatePlatform(request);
    const params = new URL(request.url).searchParams;
    const ownerId = params.get("ownerId");

    if (!ownerId) throw new WaError("TENANT_NOT_FOUND", "ownerId is required", 400);
    const tenant = await requireTenant(platform.id, ownerId);

    // Quality rating and messaging limit drift on Meta's side with no webhook,
    // so a screen that shows them needs a way to ask.
    if (params.get("refresh") === "true") {
      await refreshTenantNumbers(tenant.id);
    }

    const numbers = await prisma.waNumber.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: "asc" },
      select: {
        phoneNumberId: true,
        displayNumber: true,
        verifiedName: true,
        status: true,
        qualityRating: true,
        messagingLimitTier: true,
      },
    });

    return waOk({ ownerId, status: tenant.status, wabaId: tenant.wabaId, numbers });
  } catch (err) {
    return waFail(err);
  }
}
