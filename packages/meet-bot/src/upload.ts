import { readFile, stat } from "node:fs/promises";
import type { BotCaption } from "./meet";

/**
 * Hand the finished recording to Glitchgrab (#311).
 *
 * The bot deliberately reuses the SAME endpoints the browser extension uses —
 * `upload-urls` → PUT → `complete` — so a bot recording and an extension
 * recording are indistinguishable downstream. One Meeting row, one Sarvam
 * pipeline, one Calls page, no branch anywhere on the server.
 *
 * The bot has a single mixed track (it hears the call exactly as a human
 * participant does), so it uploads only the `tab` track. There is no separate
 * operator microphone — the bot has no voice.
 */

export interface UploadTargets {
  s3: { track: string; url: string }[];
  sarvam: { track: string; uploadUrl: string }[];
}

function headers(secret: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    // Shared-secret auth: the bot is server-side infrastructure, not a user.
    "x-gg-bot": secret,
  };
}

async function put(url: string, body: Buffer, azure: boolean): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "PUT",
      headers: azure
        ? // Azure block blobs reject a PUT without this header.
          { "x-ms-blob-type": "BlockBlob", "Content-Type": "audio/webm" }
        : { "Content-Type": "audio/webm" },
      body: new Uint8Array(body),
    });
    return res.ok;
  } catch (err) {
    console.error("[bot] upload failed:", err);
    return false;
  }
}

export async function uploadRecording(params: {
  apiBase: string;
  secret: string;
  meetingId: string;
  audioPath: string;
  durationSec: number;
  participants: string[];
  captions: BotCaption[];
}): Promise<{ ok: boolean; error?: string }> {
  const info = await stat(params.audioPath).catch(() => null);
  if (!info || info.size === 0) {
    return { ok: false, error: "Nothing was recorded" };
  }

  // Names first: the audio upload is the slow, failure-prone step, and a
  // transcript that names its speakers is worth having even if that fails.
  if (params.participants.length > 0 || params.captions.length > 0) {
    await fetch(`${params.apiBase}/api/v1/meetings/${params.meetingId}/speakers`, {
      method: "POST",
      headers: headers(params.secret),
      body: JSON.stringify({
        participants: params.participants,
        captions: params.captions,
      }),
    }).catch(() => {
      /* names are a bonus, never the deliverable */
    });
  }

  const urlRes = await fetch(
    `${params.apiBase}/api/v1/meetings/${params.meetingId}/upload-urls`,
    {
      method: "POST",
      headers: headers(params.secret),
      body: JSON.stringify({ tracks: ["tab"], transcribe: true }),
    }
  );

  if (!urlRes.ok) {
    return { ok: false, error: `Could not get upload urls (${urlRes.status})` };
  }

  const { data } = (await urlRes.json()) as { data: UploadTargets };
  const audio = await readFile(params.audioPath);

  // Our own copy first — it is the thing we promise to keep. Transcription can
  // be retried from it; a lost recording cannot be recovered at all.
  const stored: string[] = [];
  for (const target of data.s3) {
    if (await put(target.url, audio, false)) stored.push(target.track);
  }

  let sarvamUploaded = false;
  if (data.sarvam.length > 0) {
    const results = await Promise.all(
      data.sarvam.map((t) => put(t.uploadUrl, audio, true))
    );
    sarvamUploaded = results.every(Boolean);
  }

  await fetch(`${params.apiBase}/api/v1/meetings/${params.meetingId}/complete`, {
    method: "POST",
    headers: headers(params.secret),
    body: JSON.stringify({
      tracks: stored,
      durationSec: params.durationSec,
      sarvamUploaded,
      // Single track, so there is no second recorder to be offset against.
      offsetsMs: { tab: 0 },
    }),
  });

  return stored.length > 0
    ? { ok: true }
    : { ok: false, error: "Recording could not be stored" };
}

/** Report live progress so the dashboard can show more than a spinner. */
export async function reportStatus(params: {
  apiBase: string;
  secret: string;
  meetingId: string;
  botStatus: string;
  botError?: string;
}): Promise<void> {
  try {
    await fetch(`${params.apiBase}/api/v1/meetings/${params.meetingId}/bot-status`, {
      method: "POST",
      headers: headers(params.secret),
      body: JSON.stringify({ botStatus: params.botStatus, botError: params.botError }),
    });
  } catch {
    /* status is cosmetic — never fail a recording over it */
  }
}
