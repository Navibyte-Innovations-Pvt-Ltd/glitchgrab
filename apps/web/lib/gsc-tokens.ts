import { prisma } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/encrypt";
import { refreshGscToken } from "@/lib/gsc";

/**
 * Returns a valid access token for the given GscProperty.
 * Auto-refreshes if expired. Updates DB with new token when refreshed.
 * Returns null if the property is not found or tokens cannot be retrieved.
 */
export async function getValidAccessToken(propertyId: string): Promise<string | null> {
  const property = await prisma.gscProperty.findUnique({
    where: { id: propertyId },
  });

  if (!property) return null;

  const now = new Date();
  const isExpired =
    !property.tokenExpiresAt || property.tokenExpiresAt <= now;

  if (!isExpired) {
    return decrypt(property.encryptedAccessToken);
  }

  // Token expired — try to refresh
  if (!property.encryptedRefreshToken) {
    return null;
  }

  try {
    const refreshToken = decrypt(property.encryptedRefreshToken);
    const { access_token, expires_in } = await refreshGscToken(refreshToken);

    const expiresAt = new Date(Date.now() + expires_in * 1000);

    await prisma.gscProperty.update({
      where: { id: propertyId },
      data: {
        encryptedAccessToken: encrypt(access_token),
        tokenExpiresAt: expiresAt,
      },
    });

    return access_token;
  } catch {
    return null;
  }
}
