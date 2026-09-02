"use server";

import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Meeting recording storage (#311 Phase B).
 *
 * Separate from `lib/s3.ts` on purpose. Screenshots are public objects served
 * off a CDN domain; these are **recorded client conversations**. They live
 * under their own private prefix, are never made public-read, and are only ever
 * handed out as short-lived presigned URLs. Do not merge these two modules.
 */

const RECORDINGS_PREFIX = "meeting-recordings";

/** Long enough to survive a slow upload at the end of a call, short enough to matter. */
const UPLOAD_URL_TTL_SEC = 60 * 60;

/** Playback links are re-minted on every page load, so they can be brief. */
const PLAYBACK_URL_TTL_SEC = 60 * 15;

export type RecordingTrack = "tab" | "mic";

function bucket(): string {
  const name = process.env.NEXT_AWS_BUCKET_NAME || process.env.AWS_S3_BUCKET_NAME;
  if (!name) throw new Error("S3_BUCKET_NOT_CONFIGURED");
  return name;
}

/**
 * `@aws-sdk/s3-request-presigner` resolves its own nested copy of
 * `@smithy/types`, so structurally identical client/command types come out as
 * two distinct nominal types and `getSignedUrl` rejects our `S3Client`. Runtime
 * is unaffected — it is the same code either way. Forcing a single version
 * through workspace overrides did not dislodge the nested copy, so the cast is
 * contained here rather than leaking a `@ts-expect-error` to every call site.
 */
 
type PresignerClient = Parameters<typeof getSignedUrl>[0];
 
type PresignerCommand = Parameters<typeof getSignedUrl>[1];

function client(): S3Client {
  const region = process.env.NEXT_AWS_S3_REGION || process.env.AWS_S3_REGION;
  const accessKeyId = process.env.NEXT_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey =
    process.env.NEXT_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;

  if (!region || !accessKeyId || !secretAccessKey) {
    throw new Error("S3_CONFIG_INCOMPLETE");
  }

  return new S3Client({ region, credentials: { accessKeyId, secretAccessKey } });
}

/** Deterministic key so a retried upload overwrites rather than orphaning. */
export async function recordingKey(meetingId: string, track: RecordingTrack): Promise<string> {
  return `${RECORDINGS_PREFIX}/${meetingId}/${track}.webm`;
}

/**
 * A presigned PUT the browser extension uploads straight to.
 *
 * Direct-to-S3 is not an optimisation here, it is the only workable path: a
 * serverless function has a request body limit and a duration limit that a
 * multi-hundred-megabyte upload at the end of a long call will breach.
 */
export async function presignRecordingUpload(
  meetingId: string,
  track: RecordingTrack
): Promise<{ key: string; url: string }> {
  const key = await recordingKey(meetingId, track);

  // Encryption at rest comes from the BUCKET's default (S3 applies SSE-S3 to
  // every new object unless told otherwise), not from a parameter here.
  // Signing `ServerSideEncryption` into the URL makes it a signed header the
  // uploader must then reproduce exactly — the extension does not, so every
  // PUT came back `SignatureDoesNotMatch` and the recording was silently lost.
  const command = new PutObjectCommand({
    Bucket: bucket(),
    Key: key,
    ContentType: "audio/webm",
  });

  const url = await getSignedUrl(
    client() as unknown as PresignerClient,
    command as unknown as PresignerCommand,
    { expiresIn: UPLOAD_URL_TTL_SEC }
  );

  return { key, url };
}

/** Short-lived playback URL. Never a CDN link — the bucket stays private. */
export async function presignRecordingPlayback(key: string): Promise<string> {
  return getSignedUrl(
    client() as unknown as PresignerClient,
    new GetObjectCommand({ Bucket: bucket(), Key: key }) as unknown as PresignerCommand,
    { expiresIn: PLAYBACK_URL_TTL_SEC }
  );
}

// ─── Call frames (#issue-from-meeting) ───────────────────────────────────────
// Still frames the bot grabs while the call runs. Same private prefix and the
// same rules as the audio: a frame of a client's shared screen is a client
// conversation, so it never touches the public screenshot CDN in `lib/s3.ts`.

/** JPEG, so a long call's frames stay in megabytes rather than hundreds of them. */
const FRAME_CONTENT_TYPE = "image/jpeg";

/**
 * Deterministic per-frame key. `tMs` is in the name so a re-uploaded frame
 * overwrites itself instead of orphaning, and so a key alone says when it was.
 */
async function frameKey(meetingId: string, tMs: number): Promise<string> {
  return `${RECORDINGS_PREFIX}/${meetingId}/frames/${String(tMs).padStart(9, "0")}.jpg`;
}

/** A presigned PUT for one frame. Same direct-to-S3 reasoning as the audio. */
export async function presignFrameUpload(
  meetingId: string,
  tMs: number
): Promise<{ key: string; url: string }> {
  const key = await frameKey(meetingId, tMs);

  const command = new PutObjectCommand({
    Bucket: bucket(),
    Key: key,
    ContentType: FRAME_CONTENT_TYPE,
  });

  const url = await getSignedUrl(
    client() as unknown as PresignerClient,
    command as unknown as PresignerCommand,
    { expiresIn: UPLOAD_URL_TTL_SEC }
  );

  return { key, url };
}

/**
 * Read one frame back as base64, for handing to a vision model.
 *
 * The bytes have to pass through the server here — a presigned URL would let
 * the model fetch it, but Gemini takes inline data, and a public URL for a
 * client's screen is exactly what this prefix exists to prevent.
 */
export async function getFrameBase64(key: string): Promise<string> {
  const res = await client().send(
    new GetObjectCommand({ Bucket: bucket(), Key: key })
  );
  const bytes = await res.Body?.transformToByteArray();
  if (!bytes) throw new Error("FRAME_EMPTY");
  return Buffer.from(bytes).toString("base64");
}
