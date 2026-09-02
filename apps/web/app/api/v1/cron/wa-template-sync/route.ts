export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { syncTemplates } from "@/lib/wa/templates";

/**
 * GET /api/v1/cron/wa-template-sync
 *
 * Meta does push template verdicts over the webhook, but that delivery is not
 * guaranteed, and a template can be paused or recategorised long after approval
 * with no event at all. Without this poll a tenant sits looking at "pending"
 * for a template Meta approved days ago, or keeps sending on one Meta has since
 * paused. Same problem `cron/extension-watch` solves for the Chrome Web Store.
 *
 * Hourly is plenty: template review moves on the scale of hours to days, and a
 * verdict that arrives by webhook is already applied by then.
 */
export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only tenants that can actually be asked. A disconnected or suspended WABA
  // returns a permanent 4xx, and retrying those every hour forever is what
  // pinned meeting rows at "transcribing…" for days.
  const tenants = await prisma.waTenant.findMany({
    where: { status: "CONNECTED", wabaId: { not: null }, accessTokenEnc: { not: null } },
    select: { id: true, name: true },
  });

  const results: { tenantId: string; name: string; updated?: number; error?: string }[] = [];

  for (const tenant of tenants) {
    try {
      const outcome = await syncTemplates(tenant.id);
      if (outcome.updated > 0) {
        results.push({ tenantId: tenant.id, name: tenant.name, updated: outcome.updated });
      }
    } catch (err) {
      // One tenant's dead token must not stop the rest of the sweep.
      results.push({
        tenantId: tenant.id,
        name: tenant.name,
        error: err instanceof Error ? err.message : "sync failed",
      });
    }
  }

  return NextResponse.json({
    success: true,
    data: { checked: tenants.length, changed: results },
  });
}
