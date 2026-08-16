/**
 * Meeting recording orchestration (#311 Phase B), service-worker side.
 *
 * The worker owns the session state and the tab-capture handshake; the actual
 * MediaRecorders live in the offscreen document (a worker cannot hold a
 * MediaStream). Nothing here ever touches audio bytes.
 */

const OFFSCREEN_PATH = "offscreen/offscreen.html";

export interface MeetingState {
  active: boolean;
  meetingId: string | null;
  repoId: string | null;
  repoFullName: string | null;
  title: string | null;
  startedAt: number | null;
  error: string | null;
}

const state: MeetingState = {
  active: false,
  meetingId: null,
  repoId: null,
  repoFullName: null,
  title: null,
  startedAt: null,
  error: null,
};

/**
 * The MV3 worker is ephemeral — it is torn down when idle and restarted fresh,
 * which resets everything above to "not recording". The offscreen document
 * survives that and keeps recording, so a worker that forgot the meeting id has
 * no way to stop or upload it: a 40-minute call would be lost outright.
 *
 * So the live recording is mirrored to storage and restored on worker start.
 * Same pattern as `restoreTesterAuth()` in background.ts.
 */
const STORAGE_KEY = "gg_meeting_state";

async function persist(): Promise<void> {
  try {
    if (state.active) {
      await chrome.storage.local.set({ [STORAGE_KEY]: state });
    } else {
      await chrome.storage.local.remove(STORAGE_KEY);
    }
  } catch {
    /* storage unavailable — recovery is best-effort */
  }
}

/** Rehydrate a recording that outlived the worker. Called at module load. */
export async function restoreMeetingState(): Promise<void> {
  try {
    const stored = (await chrome.storage.local.get(STORAGE_KEY))[STORAGE_KEY] as
      | MeetingState
      | undefined;
    if (!stored?.active || !stored.meetingId) return;

    // Only claim to be recording if the offscreen document is genuinely still
    // there. If Chrome tore it down too, the audio is gone and pretending
    // otherwise would leave a Stop button that can never succeed.
    const alive = await chrome.offscreen.hasDocument().catch(() => false);
    if (!alive) {
      await chrome.storage.local.remove(STORAGE_KEY);
      return;
    }

    Object.assign(state, stored);
  } catch {
    /* ignore */
  }
}
void restoreMeetingState();

export function getMeetingState(): MeetingState {
  return { ...state };
}

// ── Speaker names (#311) ─────────────────────────────────────
// The tab track is every remote participant mixed together, so diarization can
// separate voices but cannot name them. These are read off the Meet page and
// used ONLY to attach names to time ranges — the words come from Sarvam.

export interface MeetCaption {
  speaker: string;
  text: string;
  t: number;
}

let captions: MeetCaption[] = [];
let participants = new Set<string>();

/** Cap so a three-hour call can't grow an unbounded buffer in the worker. */
const MAX_CAPTIONS = 5000;

export function addCaption(caption: MeetCaption): void {
  if (!state.active || captions.length >= MAX_CAPTIONS) return;
  captions.push(caption);
}

export function addParticipants(names: string[]): void {
  if (!state.active) return;
  for (const n of names) participants.add(n);
}

/** The tab this recording is capturing — the only one worth watching. */
let watchedTabId: number | null = null;

function tellTab(tabId: number, message: Record<string, unknown>) {
  try {
    void chrome.tabs.sendMessage(tabId, message).catch(() => {});
  } catch {
    /* tab gone or no content script */
  }
}

/**
 * Promise wrapper for `chrome.tabCapture.getMediaStreamId`.
 *
 * Chrome returns a promise for this in MV3, but the pinned @types/chrome only
 * declares the callback form — so call it through the callback and surface
 * `lastError`, which is where a missing `tabCapture` permission actually shows
 * up (the call itself does not throw).
 */
function getMediaStreamId(targetTabId: number): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.tabCapture.getMediaStreamId({ targetTabId }, (streamId?: string) => {
      const err = chrome.runtime.lastError;
      if (err || !streamId) {
        reject(new Error(err?.message ?? "Could not capture this tab's audio"));
        return;
      }
      resolve(streamId);
    });
  });
}

async function ensureOffscreen(): Promise<void> {
  // hasDocument() is the only reliable check — creating a second offscreen
  // document throws, and MV3 gives us no other handle on it.
  const has = await chrome.offscreen.hasDocument();
  if (has) return;

  await chrome.offscreen.createDocument({
    url: OFFSCREEN_PATH,
    reasons: [chrome.offscreen.Reason.USER_MEDIA],
    justification: "Record meeting audio (tab + microphone) for transcription.",
  });
}

async function closeOffscreen(): Promise<void> {
  try {
    if (await chrome.offscreen.hasDocument()) await chrome.offscreen.closeDocument();
  } catch {
    /* already gone */
  }
}

/**
 * Start recording the given tab.
 *
 * The meeting row is created BEFORE capture so a crash mid-call still leaves a
 * record of what was being recorded and against which project.
 */
export async function startMeetingRecording(params: {
  tabId: number;
  repoId: string;
  title: string | null;
  meetUrl: string | null;
  apiBase: string;
  sessionId: string | null;
  withMic: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  if (state.active) return { ok: false, error: "Already recording" };

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (params.sessionId) headers["x-gg-session"] = params.sessionId;

  let meetingId: string;
  let repoFullName: string;
  try {
    const res = await fetch(`${params.apiBase}/api/v1/meetings`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        repoId: params.repoId,
        title: params.title,
        meetUrl: params.meetUrl,
      }),
    });
    const json = (await res.json()) as {
      success: boolean;
      error?: string;
      data?: { id: string; repoFullName: string };
    };
    if (!res.ok || !json.success || !json.data) {
      return { ok: false, error: json.error ?? `Server said ${res.status}` };
    }
    meetingId = json.data.id;
    repoFullName = json.data.repoFullName;
  } catch {
    return { ok: false, error: "Could not reach Glitchgrab" };
  }

  // getMediaStreamId must be called from the worker with the target tab; the
  // offscreen document then consumes the id via getUserMedia.
  let streamId: string | null = null;
  try {
    streamId = await getMediaStreamId(params.tabId);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not capture this tab's audio",
    };
  }

  await ensureOffscreen();

  const response = (await chrome.runtime.sendMessage({
    type: "GG_OFFSCREEN_START",
    streamId,
    withMic: params.withMic,
  })) as { ok: boolean; error?: string };

  if (!response?.ok) {
    await closeOffscreen();
    return { ok: false, error: response?.error ?? "Recorder did not start" };
  }

  state.active = true;
  state.meetingId = meetingId;
  state.repoId = params.repoId;
  state.repoFullName = repoFullName;
  state.title = params.title;
  state.startedAt = Date.now();
  state.error = null;

  captions = [];
  participants = new Set();
  watchedTabId = params.tabId;
  // Same clock the captions are stamped against, so a caption's `t` lines up
  // with the audio timeline.
  tellTab(params.tabId, { type: "MEET_WATCH_START", startedAt: state.startedAt });

  await persist();

  return { ok: true };
}

/**
 * Ship the names read off the Meet page. Best-effort by design — losing them
 * degrades speakers back to "Client", it must never fail the recording.
 */
async function postSpeakerNames(
  apiBase: string,
  sessionId: string | null,
  meetingId: string
): Promise<void> {
  if (captions.length === 0 && participants.size === 0) return;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (sessionId) headers["x-gg-session"] = sessionId;

  try {
    await fetch(`${apiBase}/api/v1/meetings/${meetingId}/speakers`, {
      method: "POST",
      headers,
      body: JSON.stringify({ captions, participants: [...participants] }),
    });
  } catch {
    /* names are a bonus, not the deliverable */
  }

  captions = [];
  participants = new Set();
}

/** Stop, upload both tracks, and hand the server the finished recording. */
export async function stopMeetingRecording(params: {
  apiBase: string;
  sessionId: string | null;
}): Promise<{ ok: boolean; error?: string; sarvamUploaded?: boolean }> {
  if (!state.active || !state.meetingId) return { ok: false, error: "Not recording" };

  const meetingId = state.meetingId;

  if (watchedTabId !== null) {
    tellTab(watchedTabId, { type: "MEET_WATCH_STOP" });
    watchedTabId = null;
  }

  // Names go up BEFORE the audio: the upload is the slow, failure-prone part,
  // and a transcript that names its speakers is worth having even if a track
  // upload later fails.
  await postSpeakerNames(params.apiBase, params.sessionId, meetingId);

  let result: { ok: boolean; error?: string; sarvamUploaded?: boolean };
  try {
    result = (await chrome.runtime.sendMessage({
      type: "GG_OFFSCREEN_STOP",
      apiBase: params.apiBase,
      meetingId,
      sessionId: params.sessionId,
    })) as { ok: boolean; error?: string; sarvamUploaded?: boolean };
  } catch (err) {
    result = { ok: false, error: err instanceof Error ? err.message : "Recorder did not respond" };
  }

  await closeOffscreen();

  state.active = false;
  state.startedAt = null;
  state.meetingId = null;
  state.error = result?.ok ? null : (result?.error ?? "Upload failed");
  await persist();

  return result ?? { ok: false, error: "Recorder did not respond" };
}

/** True for pages where a meeting is plausibly happening. */
export function isMeetingUrl(url: string | undefined): boolean {
  if (!url) return false;
  return /^https:\/\/(meet\.google\.com|[^/]*\.?zoom\.us|teams\.(microsoft|live)\.com)\//.test(url);
}
