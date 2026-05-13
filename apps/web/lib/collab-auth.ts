import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_NAME = "glitchgrab-collab-session";
const SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "collab-fallback-secret";

interface CollabSession {
  collaboratorId: string;
  email: string;
  ownerId: string;
}

function sign(data: string): string {
  return createHmac("sha256", SECRET).update(data).digest("hex");
}

export function createCollabToken(payload: CollabSession): string {
  const exp = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
  const data = JSON.stringify({ ...payload, exp });
  const encoded = Buffer.from(data).toString("base64url");
  const sig = sign(encoded);
  return `${encoded}.${sig}`;
}

function verifyCollabToken(token: string): CollabSession | null {
  try {
    const [encoded, sig] = token.split(".");
    if (!encoded || !sig) return null;

    const expectedSig = sign(encoded);
    const sigBuf = Buffer.from(sig, "hex");
    const expectedBuf = Buffer.from(expectedSig, "hex");
    if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
      return null;
    }

    const data = JSON.parse(Buffer.from(encoded, "base64url").toString());
    if (data.exp < Date.now()) return null;

    return {
      collaboratorId: data.collaboratorId,
      email: data.email,
      ownerId: data.ownerId,
    };
  } catch {
    return null;
  }
}

export async function getCollabSession(): Promise<CollabSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return verifyCollabToken(token);
  } catch {
    return null;
  }
}

export function getCollabCookieName() {
  return COOKIE_NAME;
}
