import type { WaTemplateCategory, WaTemplateStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { WaError } from "./errors";
import { getTenantToken } from "./onboarding";
import {
  createTemplate,
  deleteTemplate,
  listTemplates,
  WaGraphError,
  type MetaTemplate,
  type MetaTemplateComponent,
} from "./graph";

/**
 * Templates.
 *
 * Meta owns approval; we own the draft and the record of what Meta last said.
 * Nothing here decides a template is usable — `status` is only ever copied from
 * Meta, never inferred locally.
 */

/** Meta's own constraint: lowercase letters, digits and underscores. */
const NAME_RE = /^[a-z0-9_]{1,512}$/;

/** Meta's statuses, mapped onto ours. Anything unknown is treated as pending. */
function mapStatus(metaStatus: string): WaTemplateStatus {
  switch (metaStatus.toUpperCase()) {
    case "APPROVED":
      return "APPROVED";
    case "REJECTED":
      return "REJECTED";
    case "PAUSED":
      return "PAUSED";
    case "DISABLED":
    case "DELETED":
      return "DISABLED";
    default:
      return "PENDING";
  }
}

function mapCategory(metaCategory?: string): WaTemplateCategory | undefined {
  switch (metaCategory?.toUpperCase()) {
    case "MARKETING":
      return "MARKETING";
    case "UTILITY":
      return "UTILITY";
    case "AUTHENTICATION":
      return "AUTHENTICATION";
    default:
      return undefined;
  }
}

export interface TemplateDraft {
  name: string;
  language: string;
  category: WaTemplateCategory;
  components: MetaTemplateComponent[];
}

/** Saves a draft locally. Nothing reaches Meta until submitTemplate(). */
export async function saveTemplate(tenantId: string, draft: TemplateDraft) {
  if (!NAME_RE.test(draft.name)) {
    throw new WaError(
      "INVALID_AMOUNT",
      "Template name must be lowercase letters, numbers and underscores only",
      400
    );
  }
  if (!draft.components?.length) {
    throw new WaError("INVALID_AMOUNT", "A template needs at least a BODY component", 400);
  }
  if (draft.category === "SERVICE") {
    // SERVICE exists in our pricing enum because Meta bills free-form service
    // conversations, but it is not a template category Meta will accept.
    throw new WaError("INVALID_AMOUNT", "SERVICE is not a submittable template category", 400);
  }

  const existing = await prisma.waTemplate.findUnique({
    where: {
      tenantId_name_language: { tenantId, name: draft.name, language: draft.language },
    },
    select: { id: true, status: true },
  });

  // Meta will not accept an edit to something already under review, and editing
  // an approved template silently resets it to pending on their side.
  if (existing && existing.status !== "DRAFT" && existing.status !== "REJECTED") {
    throw new WaError(
      "INVALID_AMOUNT",
      `Template "${draft.name}" is ${existing.status.toLowerCase()} and cannot be edited. Create a new one.`,
      409
    );
  }

  return prisma.waTemplate.upsert({
    where: {
      tenantId_name_language: { tenantId, name: draft.name, language: draft.language },
    },
    create: {
      tenantId,
      name: draft.name,
      language: draft.language,
      category: draft.category,
      components: draft.components as unknown as Prisma.InputJsonValue,
    },
    update: {
      category: draft.category,
      components: draft.components as unknown as Prisma.InputJsonValue,
      status: "DRAFT",
      rejectionReason: null,
    },
    select: { id: true, name: true, language: true, category: true, status: true },
  });
}

/** Sends a draft to Meta for approval. */
export async function submitTemplate(tenantId: string, templateId: string) {
  const template = await prisma.waTemplate.findFirst({
    where: { id: templateId, tenantId },
    select: { id: true, name: true, language: true, category: true, components: true, status: true },
  });
  if (!template) throw new WaError("TENANT_NOT_FOUND", "No such template", 404);
  if (template.status === "PENDING" || template.status === "APPROVED") {
    throw new WaError("INVALID_AMOUNT", `Template is already ${template.status.toLowerCase()}`, 409);
  }

  const { token, wabaId } = await getTenantToken(tenantId);

  try {
    const created = await createTemplate(wabaId, token, {
      name: template.name,
      language: template.language,
      category: template.category,
      components: template.components as unknown as MetaTemplateComponent[],
    });

    return prisma.waTemplate.update({
      where: { id: template.id },
      data: {
        metaTemplateId: created.id,
        // Meta can recategorise on submission — record what it decided, since
        // that is what the message will be billed as.
        category: mapCategory(created.category) ?? template.category,
        status: created.status ? mapStatus(created.status) : "PENDING",
        submittedAt: new Date(),
        lastSyncedAt: new Date(),
        rejectionReason: null,
      },
      select: { id: true, name: true, status: true, metaTemplateId: true, category: true },
    });
  } catch (err) {
    if (err instanceof WaGraphError) {
      await prisma.waTemplate.update({
        where: { id: template.id },
        data: { status: "REJECTED", rejectionReason: err.message, lastSyncedAt: new Date() },
      });
      throw new WaError("INVALID_AMOUNT", err.message, 400, { code: err.code });
    }
    throw err;
  }
}

export interface SyncResult {
  checked: number;
  updated: number;
  changes: { name: string; from: WaTemplateStatus; to: WaTemplateStatus; reason?: string }[];
}

/**
 * Reconciles one tenant's templates against Meta.
 *
 * Meta will not tell us when a verdict lands on a schedule we control, and a
 * template can be paused or recategorised long after approval. Same shape as
 * `cron/extension-watch` for the Chrome Web Store: poll, diff, report.
 *
 * Matching is by (name, language) rather than the Meta id, because a template
 * submitted outside our dashboard has no id on our side yet.
 */
export async function syncTemplates(tenantId: string): Promise<SyncResult> {
  const { token, wabaId } = await getTenantToken(tenantId);
  const remote = await listTemplates(wabaId, token);

  const local = await prisma.waTemplate.findMany({
    where: { tenantId },
    select: { id: true, name: true, language: true, status: true, category: true },
  });

  const byKey = new Map(local.map((t) => [`${t.name}::${t.language}`, t]));
  const changes: SyncResult["changes"] = [];
  let updated = 0;

  for (const r of remote) {
    const key = `${r.name}::${r.language}`;
    const existing = byKey.get(key);
    const status = mapStatus(r.status);
    const category = mapCategory(r.category);

    if (!existing) {
      // Created directly in Meta's UI. Adopt it — otherwise a send referencing
      // it fails with "no such template" even though it exists and is approved.
      await prisma.waTemplate.create({
        data: {
          tenantId,
          name: r.name,
          language: r.language,
          category: category ?? "UTILITY",
          components: (r.components ?? []) as unknown as Prisma.InputJsonValue,
          metaTemplateId: r.id,
          status,
          rejectionReason: r.rejected_reason,
          lastSyncedAt: new Date(),
        },
      });
      updated += 1;
      changes.push({ name: r.name, from: "DRAFT", to: status, reason: r.rejected_reason });
      continue;
    }

    const statusChanged = existing.status !== status;
    const categoryChanged = category !== undefined && category !== existing.category;

    if (statusChanged || categoryChanged) {
      await prisma.waTemplate.update({
        where: { id: existing.id },
        data: {
          status,
          category: category ?? existing.category,
          metaTemplateId: r.id,
          rejectionReason: r.rejected_reason ?? null,
          lastSyncedAt: new Date(),
        },
      });
      updated += 1;
      if (statusChanged) {
        changes.push({ name: r.name, from: existing.status, to: status, reason: r.rejected_reason });
      }
    } else {
      await prisma.waTemplate.update({
        where: { id: existing.id },
        data: { metaTemplateId: r.id, lastSyncedAt: new Date() },
      });
    }
  }

  return { checked: remote.length, updated, changes };
}

/** Removes a template from Meta and locally. Meta deletes by name, not id. */
export async function removeTemplate(tenantId: string, templateId: string) {
  const template = await prisma.waTemplate.findFirst({
    where: { id: templateId, tenantId },
    select: { id: true, name: true, metaTemplateId: true },
  });
  if (!template) throw new WaError("TENANT_NOT_FOUND", "No such template", 404);

  if (template.metaTemplateId) {
    const { token, wabaId } = await getTenantToken(tenantId);
    // Already gone on Meta's side is a success, not a failure.
    await deleteTemplate(wabaId, token, template.name).catch(() => undefined);
  }

  await prisma.waTemplate.delete({ where: { id: template.id } });
}

export type { MetaTemplate };
