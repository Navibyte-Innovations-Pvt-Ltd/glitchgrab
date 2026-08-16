/**
 * Sarvam **Batch** speech-to-text (#311 Phase C).
 *
 * Not to be confused with `app/api/v1/sdk/stt/route.ts`, which calls the *sync*
 * endpoint: that one is for a few seconds of dictation, caps out well short of
 * meeting length, and cannot diarize. A 30–60 minute call needs this one.
 *
 * Flow (verified against docs.sarvam.ai, Aug 2026):
 *   1. POST /speech-to-text/job/v1                → { job_id }
 *   2. POST /speech-to-text/job/v1/upload-files   → { upload_urls: { name: { file_url } } }
 *   3. PUT each audio file to its Azure SAS url   (x-ms-blob-type: BlockBlob)
 *   4. POST /speech-to-text/job/v1/{id}/start
 *   5. GET  /speech-to-text/job/v1/{id}/status    (poll)
 *   6. POST /speech-to-text/job/v1/download-files → per-file result urls
 *
 * Step 3 is deliberately NOT done here — the browser extension holds the audio
 * blob already and PUTs it straight to Azure. Pulling a few hundred MB through
 * a serverless function to hand it onward would be the slowest and least
 * reliable possible path.
 */

const SARVAM_BASE = "https://api.sarvam.ai/speech-to-text/job/v1";

/** Sarvam requires a language_code; "unknown" is the auto-detect value. */
export const AUTO_DETECT_LANGUAGE = "unknown";

/**
 * Label for the operator's own microphone track. Diarization must never split
 * this one — it is one person by construction.
 */
export const SELF_LABEL = "You";

export type SarvamJobState = "Accepted" | "Pending" | "Running" | "Completed" | "Failed";

export interface SarvamUploadTarget {
  /** The filename as Sarvam knows it — also the key into the results. */
  fileName: string;
  /** Azure SAS url. PUT the bytes here with `x-ms-blob-type: BlockBlob`. */
  uploadUrl: string;
}

/** One speaker-attributed line of a transcript. */
export interface TranscriptEntry {
  speaker: string;
  text: string;
  startSec: number;
  endSec: number;
}

interface SarvamDiarizedEntry {
  transcript?: string;
  start_time_seconds?: number;
  end_time_seconds?: number;
  speaker_id?: string;
}

interface SarvamResult {
  transcript?: string;
  language_code?: string;
  diarized_transcript?: { entries?: SarvamDiarizedEntry[] };
  timestamps?: {
    chunks?: string[];
    start_time_seconds?: number[];
    end_time_seconds?: number[];
  };
}

function apiKey(): string {
  const key = process.env.SARVAM_API_KEY;
  if (!key) throw new Error("SARVAM_API_KEY is not configured");
  return key;
}

async function sarvamFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${SARVAM_BASE}${path}`, {
    ...init,
    headers: {
      "api-subscription-key": apiKey(),
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Sarvam ${path} failed: ${res.status} ${body.slice(0, 300)}`);
  }

  return (await res.json()) as T;
}

/**
 * Create a batch job.
 *
 * `numSpeakers` applies to the tab track, where several people may join from
 * the client side. The mic track is one person by definition, so diarization
 * there would only invent distinctions — but both tracks share a job (Sarvam
 * allows 20 files per job), so this is set per job, not per file.
 */
export async function createBatchJob(params: {
  languageCode?: string;
  withDiarization?: boolean;
  numSpeakers?: number;
}): Promise<string> {
  // Verified against the live API, Aug 2026: every setting goes INSIDE
  // `job_parameters`. Sending them flat (as the docs page shows) returns
  // `body.job_parameters : Field required` — a 400 that only surfaces at the
  // end of a real call, when the recording is already over.
  const data = await sarvamFetch<{ job_id: string }>("", {
    method: "POST",
    body: JSON.stringify({
      job_parameters: {
        model: "saaras:v3",
        mode: "transcribe",
        language_code: params.languageCode ?? AUTO_DETECT_LANGUAGE,
        with_diarization: params.withDiarization ?? true,
        // Defaults to FALSE. Without timestamps there is nothing to sort on,
        // so the two tracks cannot be interleaved into one conversation.
        with_timestamps: true,
        ...(params.numSpeakers ? { num_speakers: params.numSpeakers } : {}),
      },
    }),
  });

  return data.job_id;
}

/** Ask for one Azure SAS url per file name. The caller PUTs the bytes. */
export async function getUploadTargets(
  jobId: string,
  fileNames: string[]
): Promise<SarvamUploadTarget[]> {
  const data = await sarvamFetch<{
    upload_urls?: Record<string, { file_url?: string }>;
  }>("/upload-files", {
    method: "POST",
    body: JSON.stringify({ job_id: jobId, files: fileNames }),
  });

  const urls = data.upload_urls ?? {};
  return fileNames.map((fileName) => {
    const uploadUrl = urls[fileName]?.file_url;
    if (!uploadUrl) throw new Error(`Sarvam returned no upload url for ${fileName}`);
    return { fileName, uploadUrl };
  });
}

/** Begin processing. Call only once every file has actually been PUT. */
export async function startBatchJob(jobId: string): Promise<void> {
  await sarvamFetch(`/${jobId}/start`, { method: "POST" });
}

export interface SarvamJobStatus {
  state: SarvamJobState;
  /** Output file names to pass to {@link downloadResults}, e.g. ["0.json"]. */
  outputFiles: string[];
  errorMessage?: string;
}

export async function getBatchJobStatus(jobId: string): Promise<SarvamJobStatus> {
  const data = await sarvamFetch<{
    job_state?: SarvamJobState;
    error_message?: string;
    // Sarvam has moved this field around between doc revisions; accept both
    // the flat list and the per-file detail array rather than silently
    // reporting "done, no transcript".
    output_files?: string[];
    job_details?: { file_name?: string; output_file_name?: string }[];
  }>(`/${jobId}/status`);

  const fromDetails = (data.job_details ?? [])
    .map((d) => d.output_file_name)
    .filter((n): n is string => Boolean(n));

  return {
    state: data.job_state ?? "Pending",
    outputFiles: data.output_files?.length ? data.output_files : fromDetails,
    errorMessage: data.error_message,
  };
}

/**
 * Fetch the per-file JSON results. Returns them keyed by output file name, in
 * the order requested, so the caller can map file → track → speaker.
 */
export async function downloadResults(
  jobId: string,
  fileNames: string[]
): Promise<Record<string, SarvamResult>> {
  const data = await sarvamFetch<{
    download_urls?: Record<string, { file_url?: string }>;
  }>("/download-files", {
    method: "POST",
    body: JSON.stringify({ job_id: jobId, files: fileNames }),
  });

  const urls = data.download_urls ?? {};
  const out: Record<string, SarvamResult> = {};

  await Promise.all(
    fileNames.map(async (name) => {
      const url = urls[name]?.file_url;
      if (!url) return;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return;
      out[name] = (await res.json()) as SarvamResult;
    })
  );

  return out;
}

/**
 * Turn one track's raw result into speaker-attributed lines.
 *
 * `speakerLabel` is the ground truth for the track: the mic file is the
 * operator, the tab file is the remote party. Diarization only refines *within*
 * a track — if several people joined from the client side, they come back as
 * "Client (2)" rather than being collapsed into one voice.
 */
export function toTranscriptEntries(
  result: SarvamResult | undefined,
  speakerLabel: string,
  offsetSec = 0
): TranscriptEntry[] {
  if (!result) return [];

  const diarized = result.diarized_transcript?.entries ?? [];
  if (diarized.length > 0) {
    // Only tag a speaker number when diarization actually found more than one
    // voice — "Client (1)" on every line of a one-person track is noise.
    //
    // `with_diarization` is job-scoped in Sarvam, so it runs on the microphone
    // file too. That track is one person by definition, so any split there is
    // the model inventing a second voice: never number the operator's lines.
    const speakerIds = new Set(diarized.map((e) => e.speaker_id ?? "0"));
    const multi = speakerIds.size > 1 && speakerLabel !== SELF_LABEL;

    return diarized
      .filter((e) => e.transcript?.trim())
      .map((e) => ({
        speaker: multi ? `${speakerLabel} (${(e.speaker_id ?? "0") as string})` : speakerLabel,
        text: (e.transcript ?? "").trim(),
        startSec: (e.start_time_seconds ?? 0) + offsetSec,
        endSec: (e.end_time_seconds ?? 0) + offsetSec,
      }));
  }

  // No diarization came back — fall back to the chunk timestamps so the merge
  // can still interleave this track against the other one.
  const chunks = result.timestamps?.chunks ?? [];
  if (chunks.length > 0) {
    const starts = result.timestamps?.start_time_seconds ?? [];
    const ends = result.timestamps?.end_time_seconds ?? [];
    return chunks
      .map((text, i) => ({
        speaker: speakerLabel,
        text: text.trim(),
        startSec: (starts[i] ?? 0) + offsetSec,
        endSec: (ends[i] ?? starts[i] ?? 0) + offsetSec,
      }))
      .filter((e) => e.text);
  }

  // Last resort: one undated block. Better than losing the transcript.
  const flat = result.transcript?.trim();
  return flat
    ? [{ speaker: speakerLabel, text: flat, startSec: offsetSec, endSec: offsetSec }]
    : [];
}

/**
 * Interleave both tracks into one conversation by time.
 *
 * Both recorders start in the same tick in the extension, so the two timelines
 * share an origin and a plain sort is enough — no alignment pass needed.
 */
export function mergeTranscripts(tracks: TranscriptEntry[][]): TranscriptEntry[] {
  return tracks.flat().sort((a, b) => a.startSec - b.startSec);
}

/** Render the merged timeline as the readable transcript stored on Meeting. */
export function formatTranscript(entries: TranscriptEntry[]): string {
  return entries
    .map((e) => {
      const mins = Math.floor(e.startSec / 60);
      const secs = Math.floor(e.startSec % 60);
      const stamp = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
      return `[${stamp}] ${e.speaker}: ${e.text}`;
    })
    .join("\n");
}
