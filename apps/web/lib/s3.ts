"use server";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

function createS3Client() {
  const region = process.env.NEXT_AWS_S3_REGION || process.env.AWS_S3_REGION;
  const accessKeyId = process.env.NEXT_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.NEXT_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;

  if (!region || !accessKeyId || !secretAccessKey) {
    throw new Error("S3_CONFIG_INCOMPLETE");
  }

  return new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });
}

/**
 * Upload a base64 data URL image to S3 and return the public URL.
 * Returns null if S3 is not configured or upload fails.
 */
export async function uploadScreenshotToS3(
  base64DataUrl: string,
  reportId: string
): Promise<string | null> {
  const bucketName = process.env.NEXT_AWS_BUCKET_NAME || process.env.AWS_S3_BUCKET_NAME;
  const region = process.env.NEXT_AWS_S3_REGION || process.env.AWS_S3_REGION;

  if (!bucketName || !region) {
    console.error("[S3] Missing config:", { bucketName: !!bucketName, region: !!region });
    return null;
  }

  const base64Match = base64DataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!base64Match) return null;

  const ext = base64Match[1] === "jpeg" ? "jpg" : base64Match[1];
  const base64Content = base64Match[2];
  const buffer = Buffer.from(base64Content, "base64");
  const key = `screenshots/${reportId}.${ext}`;
  const contentType = `image/${base64Match[1]}`;

  try {
    const s3Client = createS3Client();
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );

    return `https://cdn.glitchgrab.dev/${key}?v=${Date.now()}`;
  } catch (error) {
    console.error("[S3] Upload failed:", error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Presigned PUT for an image an agent already has on disk.
 *
 * Deliberately NOT base64-over-JSON: an MCP client would have to read the file
 * and emit ~600KB of base64 into its own context per screenshot. The caller
 * gets a URL and does `curl -T file <uploadUrl>` instead, so the bytes never
 * pass through the model.
 *
 * The key stays under `screenshots/` on purpose. That is the one prefix the
 * cdn.glitchgrab.dev distribution is proven to serve publicly (every SDK bug
 * report writes there); a fresh prefix can land in the bucket and still 404 at
 * the CDN, which is the broken-image failure this whole path exists to avoid.
 */
export async function createScreenshotUploadUrl(
  filename: string,
  contentType: string
): Promise<{ uploadUrl: string; publicUrl: string; key: string } | null> {
  const bucketName = process.env.NEXT_AWS_BUCKET_NAME || process.env.AWS_S3_BUCKET_NAME;
  if (!bucketName) {
    console.error("[S3] Missing bucket config for presigned upload");
    return null;
  }

  if (!contentType.startsWith("image/")) return null;

  // Keep the caller's name for readability in the issue, but never let it pick
  // the key: a name with `/` or `..` would write outside the prefix.
  const safeName =
    filename
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .replace(/^[.-]+/, "")
      .slice(-80) || "image.png";
  const key = `screenshots/${randomUUID()}-${safeName}`;

  try {
    const uploadUrl = await getSignedUrl(
      // Both casts: `s3-request-presigner` ships its own nested @smithy/types
      // copy, so the structurally identical client and command fail to match
      // its parameter types. A known AWS SDK duplicate-types issue, not a real
      // mismatch — deduping it would mean a lockfile-wide resolution override
      // for one call site.
      createS3Client() as unknown as Parameters<typeof getSignedUrl>[0],
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        ContentType: contentType,
      }) as unknown as Parameters<typeof getSignedUrl>[1],
      { expiresIn: 900 }
    );
    // Read URL is the CDN, never the S3 origin — the bucket is not public-read,
    // so handing back the signed host would 403 the moment the token expires.
    return { uploadUrl, publicUrl: `https://cdn.glitchgrab.dev/${key}`, key };
  } catch (error) {
    console.error("[S3] Presign failed:", error instanceof Error ? error.message : error);
    return null;
  }
}
