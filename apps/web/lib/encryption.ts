import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error("ENCRYPTION_KEY environment variable is not set");
  }
  // Key must be 32 bytes for AES-256
  const keyBuffer = Buffer.from(key, "hex");
  if (keyBuffer.length !== 32) {
    throw new Error("ENCRYPTION_KEY must be 64 hex characters (32 bytes)");
  }
  return keyBuffer;
}

/**
 * Encrypts plaintext using AES-256-GCM.
 * Returns a string in the format: iv:ciphertext:tag (all hex-encoded)
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const tag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${encrypted}:${tag.toString("hex")}`;
}

/**
 * Decrypts a string in the format: iv:ciphertext:tag (all hex-encoded)
 * Returns the original plaintext.
 */
export function decrypt(encrypted: string): string {
  const key = getKey();
  const parts = encrypted.split(":");

  if (parts.length !== 3) {
    throw new Error("Invalid encrypted string format — expected iv:ciphertext:tag");
  }

  const [ivHex, ciphertextHex, tagHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");

  if (iv.length !== IV_LENGTH) {
    throw new Error("Invalid IV length");
  }
  if (tag.length !== TAG_LENGTH) {
    throw new Error("Invalid auth tag length");
  }

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(ciphertextHex, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
