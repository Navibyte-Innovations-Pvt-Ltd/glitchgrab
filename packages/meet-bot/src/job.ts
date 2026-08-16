import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startRecording } from "./audio";
import { enableCaptions, joinMeeting, readParticipants, watchCaptions } from "./meet";
import { reportStatus, uploadRecording } from "./upload";

/**
 * One bot recording, start to finish (#311).
 *
 * Join → wait to be admitted → record → leave → upload. Every stage reports
 * its state back so the dashboard shows "waiting to be admitted" rather than an
 * indefinite spinner — the admission step needs a human to click Admit, and a
 * silent spinner gives them no reason to.
 */

export interface JobParams {
  meetingId: string;
  meetUrl: string;
  apiBase: string;
  secret: string;
  botName: string;
}

/** How long to wait for someone to press Admit before giving up. */
const ADMIT_TIMEOUT_MS = 10 * 60 * 1000;

/** Nothing records forever — a call left open all night must still terminate. */
const MAX_DURATION_MS = 3 * 60 * 60 * 1000;

export async function runBotJob(params: JobParams): Promise<void> {
  const workDir = await mkdtemp(join(tmpdir(), "gg-meet-"));
  const audioPath = join(workDir, "tab.webm");

  const status = (botStatus: string, botError?: string) =>
    reportStatus({
      apiBase: params.apiBase,
      secret: params.secret,
      meetingId: params.meetingId,
      botStatus,
      botError,
    });

  await status("JOINING");

  let session;
  try {
    session = await joinMeeting({
      meetUrl: params.meetUrl,
      botName: params.botName,
      admitTimeoutMs: ADMIT_TIMEOUT_MS,
      maxDurationMs: MAX_DURATION_MS,
      onWaitingAdmit: () => void status("WAITING_ADMIT"),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not join the meeting";
    console.error("[bot] join failed:", message);
    await status("FAILED", message);
    await rm(workDir, { recursive: true, force: true });
    return;
  }

  await status("RECORDING");

  // Recording starts only AFTER admission, so a long wait in the lobby doesn't
  // become minutes of silence at the head of every file.
  const startedAt = Date.now();
  const recording = startRecording(audioPath);

  // Captions are the only way to attach real names to voices on a group call —
  // the bot hears one mixed stream exactly like a human participant does.
  // A silent false here is indistinguishable from "nobody spoke", so say so.
  const captionsOn = await enableCaptions(session.page).catch(() => false);
  if (!captionsOn) {
    console.warn(
      "[bot] could not turn on Meet captions — speakers will stay generic on group calls"
    );
  }
  const captionWatcher = watchCaptions(session.page, startedAt);

  const participants = new Set<string>();
  const participantTimer = setInterval(() => {
    void readParticipants(session.page).then((names) => {
      for (const n of names) participants.add(n);
    });
  }, 15_000);
  const firstRead = await readParticipants(session.page);
  // The bot runs headless on a server, so this log is the ONLY way to see what
  // Meet's DOM actually yields. Needed to tune the name filter against reality
  // rather than guesswork.
  console.log("[bot] Meet participants (raw):", JSON.stringify(firstRead));
  for (const n of firstRead) participants.add(n);

  let reason: "ended" | "max-duration" = "ended";
  try {
    reason = await session.waitForEnd();
  } catch (err) {
    console.error("[bot] wait failed:", err);
  }

  clearInterval(participantTimer);
  const captions = captionWatcher.stop();
  const durationSec = (Date.now() - startedAt) / 1000;

  await recording.stop();
  await session.leave().catch(() => {});

  if (reason === "max-duration") {
    console.warn("[bot] hit the maximum recording duration");
  }

  await status("UPLOADING");

  const result = await uploadRecording({
    apiBase: params.apiBase,
    secret: params.secret,
    meetingId: params.meetingId,
    audioPath,
    durationSec,
    participants: [...participants],
    captions,
  });

  await status(result.ok ? "DONE" : "FAILED", result.error);
  await rm(workDir, { recursive: true, force: true });
}
