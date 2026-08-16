/**
 * What the bot is doing right now (#311).
 *
 * The service can hold several meetings at once, each with its own browser,
 * sound sink and encoder. Without a registry the only visible state is a count,
 * which cannot answer the questions that actually matter mid-incident: which
 * call is this, how long has it been going, and is it stuck waiting to be
 * admitted or genuinely recording?
 */

export type JobPhase =
  | "JOINING"
  | "WAITING_ADMIT"
  | "RECORDING"
  | "UPLOADING"
  | "DONE"
  | "FAILED";

export interface JobRecord {
  meetingId: string;
  meetUrl: string;
  phase: JobPhase;
  /** When the bot was asked to join. */
  startedAt: number;
  /** When it was admitted — recording time is measured from here, not from the ask. */
  joinedAt: number | null;
  endedAt: number | null;
  error: string | null;
  /** PulseAudio sink this job records from. One per job, never shared. */
  sink: string | null;
}

const live = new Map<string, JobRecord>();

/** Finished jobs, newest first — enough to answer "what happened on the last call?". */
const history: JobRecord[] = [];
const MAX_HISTORY = 20;

const bootedAt = Date.now();

export function startJob(meetingId: string, meetUrl: string): JobRecord {
  const record: JobRecord = {
    meetingId,
    meetUrl,
    phase: "JOINING",
    startedAt: Date.now(),
    joinedAt: null,
    endedAt: null,
    error: null,
    sink: null,
  };
  live.set(meetingId, record);
  return record;
}

export function setPhase(meetingId: string, phase: JobPhase, error?: string): void {
  const record = live.get(meetingId);
  if (!record) return;

  record.phase = phase;
  if (error) record.error = error;
  // Admission is the moment recording actually begins; time spent knocking is
  // not recording time and conflating them makes a stuck bot look productive.
  if (phase === "RECORDING" && !record.joinedAt) record.joinedAt = Date.now();
}

export function setSink(meetingId: string, sink: string | null): void {
  const record = live.get(meetingId);
  if (record) record.sink = sink;
}

export function finishJob(meetingId: string, phase: "DONE" | "FAILED", error?: string): void {
  const record = live.get(meetingId);
  if (!record) return;

  record.phase = phase;
  record.endedAt = Date.now();
  if (error) record.error = error;

  live.delete(meetingId);
  history.unshift(record);
  if (history.length > MAX_HISTORY) history.pop();
}

export function isLive(meetingId: string): boolean {
  return live.has(meetingId);
}

export function liveCount(): number {
  return live.size;
}

function view(record: JobRecord) {
  const now = Date.now();
  return {
    meetingId: record.meetingId,
    meetUrl: record.meetUrl,
    phase: record.phase,
    startedAt: new Date(record.startedAt).toISOString(),
    endedAt: record.endedAt ? new Date(record.endedAt).toISOString() : null,
    /** Wall-clock since the bot was asked to join, including time in the lobby. */
    elapsedSec: Math.round(((record.endedAt ?? now) - record.startedAt) / 1000),
    /** Time actually inside the call. Null while still waiting to be admitted. */
    recordingSec: record.joinedAt
      ? Math.round(((record.endedAt ?? now) - record.joinedAt) / 1000)
      : null,
    error: record.error,
    sink: record.sink,
  };
}

export function statusReport(capacity: number) {
  return {
    uptimeSec: Math.round((Date.now() - bootedAt) / 1000),
    capacity,
    active: live.size,
    slotsAvailable: Math.max(0, capacity - live.size),
    jobs: [...live.values()].map(view),
    recent: history.map(view),
  };
}
