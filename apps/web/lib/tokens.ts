import { randomBytes, createHash } from "crypto";

export function generateToken(): string {
  const raw = randomBytes(24).toString("base64url");
  return `gg_${raw}`;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
