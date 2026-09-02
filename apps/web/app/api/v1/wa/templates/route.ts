export const dynamic = "force-dynamic";

import type { WaTemplateCategory } from "@prisma/client";
import { prisma } from "@/lib/db";
import { authenticatePlatform, requireTenant } from "@/lib/wa/auth";
import { saveTemplate } from "@/lib/wa/templates";
import { WaError } from "@/lib/wa/errors";
import { waOk, waFail } from "@/lib/wa/response";
import type { MetaTemplateComponent } from "@/lib/wa/graph";

/** The tenant's templates and whatever Meta last told us about each. */
export async function GET(request: Request) {
  try {
    const platform = await authenticatePlatform(request);
    const params = new URL(request.url).searchParams;
    const ownerId = params.get("ownerId");
    if (!ownerId) throw new WaError("TENANT_NOT_FOUND", "ownerId is required", 400);

    const tenant = await requireTenant(platform.id, ownerId);
    const status = params.get("status");

    const templates = await prisma.waTemplate.findMany({
      where: {
        tenantId: tenant.id,
        ...(status ? { status: status as never } : {}),
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        language: true,
        category: true,
        status: true,
        rejectionReason: true,
        components: true,
        submittedAt: true,
        lastSyncedAt: true,
      },
    });

    return waOk({ ownerId, templates });
  } catch (err) {
    return waFail(err);
  }
}

/** Saves a draft. Nothing reaches Meta until POST /templates/:id/submit. */
export async function POST(request: Request) {
  try {
    const platform = await authenticatePlatform(request);
    const body = (await request.json()) as {
      ownerId?: string;
      name?: string;
      language?: string;
      category?: WaTemplateCategory;
      components?: MetaTemplateComponent[];
    };

    if (!body.ownerId) throw new WaError("TENANT_NOT_FOUND", "ownerId is required", 400);
    if (!body.name || !body.language || !body.category) {
      throw new WaError("INVALID_AMOUNT", "name, language and category are required", 400);
    }

    const tenant = await requireTenant(platform.id, body.ownerId);

    const template = await saveTemplate(tenant.id, {
      name: body.name,
      language: body.language,
      category: body.category,
      components: body.components ?? [],
    });

    return waOk({ ownerId: body.ownerId, template }, 201);
  } catch (err) {
    return waFail(err);
  }
}
