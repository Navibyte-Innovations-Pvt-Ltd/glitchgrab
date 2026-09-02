import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/db";
import { WaError } from "./errors";

/**
 * Platform keys are `ggwa_`-prefixed so they can never be confused with a `gg_`
 * repo token — different product, different table, different blast radius if
 * leaked. Stored as SHA-256, never plaintext, same as ApiToken.
 */
export function generateWaPlatformKey(): string {
  return `ggwa_${randomBytes(24).toString("base64url")}`;
}

export function hashWaPlatformKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export interface AuthedPlatform {
  id: string;
  name: string;
  slug: string;
  callbackUrl: string | null;
}

/**
 * Resolves the Bearer key on a request to its platform row.
 *
 * This is the only place a platform identity enters the system. Everything
 * downstream — tenants, wallets, prices — is scoped from the returned id, never
 * from anything in the request body.
 */
export async function authenticatePlatform(request: Request): Promise<AuthedPlatform> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ggwa_")) {
    throw new WaError("UNAUTHORIZED", "Missing or malformed platform key", 401);
  }

  const platform = await prisma.waPlatform.findUnique({
    where: { apiKeyHash: hashWaPlatformKey(header.slice("Bearer ".length)) },
    select: { id: true, name: true, slug: true, callbackUrl: true, active: true },
  });

  if (!platform) throw new WaError("UNAUTHORIZED", "Unknown platform key", 401);
  if (!platform.active) {
    throw new WaError("PLATFORM_INACTIVE", "This platform has been deactivated", 403);
  }

  return {
    id: platform.id,
    name: platform.name,
    slug: platform.slug,
    callbackUrl: platform.callbackUrl,
  };
}

/**
 * Maps a platform's OWN user id to our tenant row, creating it on first sight.
 *
 * The platform never sends us a tenantId. It sends the id it already uses for
 * that customer, and we own the mapping — so a compromised or buggy platform
 * integration cannot address another platform's tenant by guessing an id.
 */
export async function resolveTenant(
  platformId: string,
  externalOwnerId: string,
  name?: string
): Promise<{ id: string; name: string; status: string; wabaId: string | null }> {
  if (!externalOwnerId?.trim()) {
    throw new WaError("TENANT_NOT_FOUND", "ownerId is required", 400);
  }

  const tenant = await prisma.waTenant.upsert({
    where: { platformId_externalOwnerId: { platformId, externalOwnerId } },
    create: { platformId, externalOwnerId, name: name?.trim() || externalOwnerId },
    update: name?.trim() ? { name: name.trim() } : {},
    select: { id: true, name: true, status: true, wabaId: true },
  });

  return tenant;
}

/** Read-only lookup — throws rather than creating. Use where a tenant must already exist. */
export async function requireTenant(platformId: string, externalOwnerId: string) {
  const tenant = await prisma.waTenant.findUnique({
    where: { platformId_externalOwnerId: { platformId, externalOwnerId } },
    select: { id: true, name: true, status: true, wabaId: true },
  });
  if (!tenant) throw new WaError("TENANT_NOT_FOUND", "No such owner for this platform", 404);
  return tenant;
}
