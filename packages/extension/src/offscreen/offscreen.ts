/**
 * Meeting audio recorder (#311 Phase B).
 *
 * Lives in an offscreen document because an MV3 service worker cannot hold a
 * MediaStream, cannot run a MediaRecorder, and cannot call getUserMedia.
 *
 * Records **two separate tracks**:
 *   - `tab` — the Meet/Zoom tab's audio. Meet never plays your own voice back,
 *     so this track is the remote party.
 *   - `mic` — the operator's microphone.
 *
 * They stay separate rather than being mixed: which file a line came from IS
 * the speaker, which is better ground truth than anything diarization can
 * infer, and it stays correct when both people talk at once.
 *
 * The blobs are uploaded from here, not handed back to the worker — passing a
 * few hundred megabytes through chrome messaging would serialize the whole
 * thing through the structured-clone path for no reason.
 */

type TrackName = "tab" | "mic";

interface StartMessage {
  type: "GG_OFFSCREEN_START";
  streamId: string | null;
  withMic: boolean;
}

interface StopMessage {
  type: "GG_OFFSCREEN_STOP";
  apiBase: string;
  meetingId: string;
  sessionId: string | null;
}

interface Recorder {
  recorder: MediaRecorder;
  chunks: Blob[];
  stream: MediaStream;
  /** performance.now() at the exact moment this recorder started. */
  startedAt: number;
}

const MIME = "audio/webm;codecs=opus";

const recorders = new Map<TrackName, Recorder>();
let startedAt = 0;

/**
 * Keeps the captured tab audible to the operator.
 *
 * chrome.tabCapture **mutes the tab for the user** the moment capture starts —
 * without routing the captured stream back to the default output, the developer
 * hears silence for the entire call. Found the hard way is not an option here:
 * the call is unrepeatable.
 */
let passthroughCtx: AudioContext | null = null;

function startPassthrough(stream: MediaStream) {
  try {
    passthroughCtx = new AudioContext();
    const source = passthroughCtx.createMediaStreamSource(stream);
    source.connect(passthroughCtx.destination);
  } catch (err) {
    console.error("[GG-offscreen] passthrough failed — operator may hear silence", err);
  }
}

function stopPassthrough() {
  try {
    passthroughCtx?.close();
  } catch {
    /* already closed */
  }
  passthroughCtx = null;
}

function attach(name: TrackName, stream: MediaStream) {
  const chunks: Blob[] = [];
  const recorder = new MediaRecorder(stream, {
    mimeType: MediaRecorder.isTypeSupported(MIME) ? MIME : "audio/webm",
    // Speech at ~48 kbps is plainly intelligible and keeps an hour near 20 MB,
    // so the upload still finishes on a bad connection at the end of a call.
    audioBitsPerSecond: 48_000,
  });

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  // Timeslice rather than one giant buffer: a crash mid-call then costs the
  // last second, not the whole recording.
  recorder.start(1000);
  // Stamped immediately after start(): each Sarvam transcript is timed from its
  // OWN file's beginning, so without the real per-track start the merge would
  // interleave the two speakers wrongly.
  recorders.set(name, { recorder, chunks, stream, startedAt: performance.now() });
}

async function startRecording(msg: StartMessage): Promise<{ tracks: TrackName[] }> {
  // Acquire BOTH devices before starting either recorder. Microphone
  // acquisition takes hundreds of milliseconds to seconds (device init), so
  // awaiting them in sequence would start the mic that much later than the tab
  // — and every mic line would then merge in ahead of where it belongs.
  const [tabStream, micStream] = await Promise.all([
    msg.streamId
      ? // Tab capture uses the legacy constraint shape — chromeMediaSource
        // lives under `mandatory`, not in normal MediaTrackConstraints.
        navigator.mediaDevices.getUserMedia({
          audio: {
            mandatory: {
              chromeMediaSource: "tab",
              chromeMediaSourceId: msg.streamId,
            },
          },
          video: false,
        } as unknown as MediaStreamConstraints)
      : Promise.resolve(null),
    msg.withMic
      ? // Permission must already have been granted from a real extension page
        // — an offscreen document cannot show a permission prompt.
        navigator.mediaDevices
          .getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true },
            video: false,
          })
          // A missing mic must not cost the client's side of the call.
          .catch(() => null)
      : Promise.resolve(null),
  ]);

  const tracks: TrackName[] = [];

  if (tabStream) {
    startPassthrough(tabStream);
    attach("tab", tabStream);
    tracks.push("tab");
  }
  if (micStream) {
    attach("mic", micStream);
    tracks.push("mic");
  }

  if (tracks.length === 0) throw new Error("Nothing to record");

  startedAt = Date.now();
  return { tracks };
}

/** Stop one recorder and resolve with its finished blob. */
function finish(name: TrackName): Promise<Blob | null> {
  const entry = recorders.get(name);
  if (!entry) return Promise.resolve(null);

  return new Promise((resolve) => {
    entry.recorder.onstop = () => {
      entry.stream.getTracks().forEach((t) => t.stop());
      resolve(new Blob(entry.chunks, { type: "audio/webm" }));
    };
    try {
      entry.recorder.stop();
    } catch {
      resolve(null);
    }
  });
}

async function putBlob(url: string, blob: Blob, azure: boolean): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "PUT",
      headers: azure
        ? // Azure block blobs reject a PUT without this header.
          { "x-ms-blob-type": "BlockBlob", "Content-Type": "audio/webm" }
        : { "Content-Type": "audio/webm" },
      body: blob,
    });
    return res.ok;
  } catch (err) {
    console.error("[GG-offscreen] upload failed", err);
    return false;
  }
}

interface UploadTargets {
  s3: { track: TrackName; url: string }[];
  sarvam: { track: TrackName; uploadUrl: string }[];
}

async function stopAndUpload(msg: StopMessage) {
  const durationSec = startedAt ? (Date.now() - startedAt) / 1000 : 0;

  const names = [...recorders.keys()];

  // How much later than the earliest recorder each track began. Sarvam times
  // each file from its own start, so this is what lets the two transcripts be
  // interleaved into one true conversation.
  const earliest = Math.min(...names.map((n) => recorders.get(n)!.startedAt));
  const offsetsMs: Record<string, number> = {};
  for (const name of names) {
    offsetsMs[name] = Math.round(recorders.get(name)!.startedAt - earliest);
  }

  const blobs = new Map<TrackName, Blob>();
  for (const name of names) {
    const blob = await finish(name);
    if (blob && blob.size > 0) blobs.set(name, blob);
  }
  recorders.clear();
  stopPassthrough();

  const tracks = [...blobs.keys()];
  if (tracks.length === 0) {
    return { ok: false, error: "Nothing was recorded" };
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (msg.sessionId) headers["x-gg-session"] = msg.sessionId;

  const urlRes = await fetch(`${msg.apiBase}/api/v1/meetings/${msg.meetingId}/upload-urls`, {
    method: "POST",
    headers,
    body: JSON.stringify({ tracks, transcribe: true, numSpeakers: undefined }),
  });

  if (!urlRes.ok) {
    return { ok: false, error: `Could not get upload urls (${urlRes.status})` };
  }

  const { data } = (await urlRes.json()) as { data: UploadTargets };

  // Our own copy first — it is the thing we promise to keep. Transcription can
  // be retried from it later; a lost recording cannot be recovered at all.
  const s3Results = await Promise.all(
    data.s3.map(async (t) => {
      const blob = blobs.get(t.track);
      return blob ? putBlob(t.url, blob, false) : false;
    })
  );
  const storedTracks = data.s3.filter((_, i) => s3Results[i]).map((t) => t.track);

  let sarvamUploaded = false;
  if (data.sarvam.length > 0) {
    const results = await Promise.all(
      data.sarvam.map(async (t) => {
        const blob = blobs.get(t.track);
        return blob ? putBlob(t.uploadUrl, blob, true) : false;
      })
    );
    sarvamUploaded = results.every(Boolean);
  }

  await fetch(`${msg.apiBase}/api/v1/meetings/${msg.meetingId}/complete`, {
    method: "POST",
    headers,
    body: JSON.stringify({ tracks: storedTracks, durationSec, sarvamUploaded, offsetsMs }),
  });

  return { ok: storedTracks.length > 0, tracks: storedTracks, sarvamUploaded };
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "GG_OFFSCREEN_START") {
    startRecording(msg as StartMessage)
      .then((r) => sendResponse({ ok: true, ...r }))
      .catch((err: Error) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (msg?.type === "GG_OFFSCREEN_STOP") {
    stopAndUpload(msg as StopMessage)
      .then(sendResponse)
      .catch((err: Error) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  return false;
});
