import { prisma } from "@/lib/db";
import {
  downloadResults,
  formatTranscript,
  getBatchJobStatus,
  mergeTranscripts,
  SELF_LABEL,
  toTranscriptEntries,
} from "./batch";
import { applySpeakerNames, type MeetCaption } from "./speakers";

/**
 * Collect a finished Sarvam batch job onto its Meeting (#311 Phase C).
 *
 * Sarvam is asynchronous and a 60-minute call takes minutes to transcribe, so
 * nothing can wait inline. This is called by the poll route/cron and is safe to
 * run repeatedly: a job that is still Running just leaves the row alone.
 */

/** Which track a result came from IS the speaker — that's why they're separate files. */
const SPEAKER_BY_TRACK: Record<string, string> = {
  tab: "Client",
  // Must stay SELF_LABEL: toTranscriptEntries keys the "never split this track"
  // rule off the exact string.
  mic: SELF_LABEL,
};

interface TrackFile {
  index: number;
  track: string;
  fileName: string;
  offsetMs?: number;
}

interface CollectOutcome {
  status: "RUNNING" | "DONE" | "FAILED";
  message?: string;
}

/**
 * The operator's own name(s), so their Meet tile is never mistaken for the
 * client when deciding who "the one other person in the call" is.
 */
async function operatorNames(userId: string | null): Promise<string[]> {
  if (!userId) return [];
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  });
  return user?.name ? [user.name] : [];
}

export async function collectMeetingTranscript(meetingId: string): Promise<CollectOutcome> {
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    select: {
      id: true,
      transcriptJobId: true,
      transcriptStatus: true,
      tabRecordingKey: true,
      micRecordingKey: true,
      transcriptFiles: true,
      captions: true,
      participants: true,
      createdById: true,
    },
  });

  if (!meeting?.transcriptJobId) return { status: "FAILED", message: "No transcription job" };
  if (meeting.transcriptStatus === "DONE") return { status: "DONE" };

  let status;
  try {
    status = await getBatchJobStatus(meeting.transcriptJobId);
  } catch (err) {
    // A transient Sarvam outage must not mark the job failed forever — leave it
    // RUNNING so the next poll retries.
    console.error("[sarvam] status check failed:", err);
    return { status: "RUNNING", message: "Could not reach Sarvam" };
  }

  if (status.state === "Failed") {
    await prisma.meeting.update({
      where: { id: meeting.id },
      data: {
        transcriptStatus: "FAILED",
        transcriptError: status.errorMessage ?? "Sarvam reported the job failed",
      },
    });
    return { status: "FAILED", message: status.errorMessage };
  }

  if (status.state !== "Completed") return { status: "RUNNING" };

  // The file map written when the job was created. Sarvam names results
  // POSITIONALLY ("0.json"), so a result cannot be attributed to a speaker by
  // its name — submission order is the only link back to a track.
  const files = Array.isArray(meeting.transcriptFiles)
    ? ([...(meeting.transcriptFiles as unknown as TrackFile[])].sort(
        (a, b) => a.index - b.index
      ) as TrackFile[])
    : [];

  const wanted =
    status.outputFiles.length > 0 ? status.outputFiles : files.map((f) => f.fileName);

  let results;
  try {
    results = await downloadResults(meeting.transcriptJobId, wanted);
  } catch (err) {
    console.error("[sarvam] download failed:", err);
    return { status: "RUNNING", message: "Could not download results" };
  }

  const entries = mergeTranscripts(
    wanted.map((outputName, position) => {
      const result = results[outputName];
      if (!result) return [];

      // Positional first (matches how Sarvam actually names outputs), then a
      // name match for revisions that echo our own file names back.
      const file =
        files[position] ?? files.find((f) => outputName.includes(f.track));
      const speaker = SPEAKER_BY_TRACK[file?.track ?? ""] ?? "Client";

      return toTranscriptEntries(result, speaker, (file?.offsetMs ?? 0) / 1000);
    })
  );

  // Put real names on the remote speakers where the Meet page gave us proof.
  // Without this the client is only ever "Client (0)" / "Client (1)", because
  // the tab track is every remote participant mixed together.
  const named = applySpeakerNames(entries, {
    captions: Array.isArray(meeting.captions)
      ? (meeting.captions as unknown as MeetCaption[])
      : [],
    participants: Array.isArray(meeting.participants)
      ? (meeting.participants as unknown as string[])
      : [],
    selfNames: await operatorNames(meeting.createdById),
  });

  if (entries.length === 0) {
    await prisma.meeting.update({
      where: { id: meeting.id },
      data: {
        transcriptStatus: "FAILED",
        transcriptError: "Sarvam finished but returned no speech",
      },
    });
    return { status: "FAILED", message: "No speech found" };
  }

  await prisma.meeting.update({
    where: { id: meeting.id },
    data: {
      transcript: formatTranscript(named),
      transcriptRaw: results as object,
      transcriptStatus: "DONE",
      transcriptError: null,
    },
  });

  return { status: "DONE" };
}
