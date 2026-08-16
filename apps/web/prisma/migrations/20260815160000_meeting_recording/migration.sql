-- Meeting recording (#311 Phase B/C) — turns the Phase A `Meeting` stub into a
-- real recorded call: two audio tracks, a Sarvam batch job, a transcript.
--
-- Safe to drop/replace columns here: `Meeting` was a stub, nothing ever wrote
-- to it, and the table is empty.

CREATE TYPE "TranscriptStatus" AS ENUM ('IDLE', 'RUNNING', 'DONE', 'FAILED');

-- `recordingKey` assumed one mixed file. Recording is two separate tracks —
-- which file a line came from IS the speaker, which beats diarization guessing.
ALTER TABLE "Meeting" DROP COLUMN "recordingKey";
ALTER TABLE "Meeting" ADD COLUMN "tabRecordingKey" TEXT;
ALTER TABLE "Meeting" ADD COLUMN "micRecordingKey" TEXT;

-- transcriptStatus was a loose TEXT; a fixed set of states is what the poll
-- cron selects on.
ALTER TABLE "Meeting" DROP COLUMN "transcriptStatus";
ALTER TABLE "Meeting" ADD COLUMN "transcriptStatus" "TranscriptStatus" NOT NULL DEFAULT 'IDLE';

ALTER TABLE "Meeting" ADD COLUMN "durationSec" INTEGER;
ALTER TABLE "Meeting" ADD COLUMN "transcriptRaw" JSONB;
-- Stored so a poll survives a cold start; without it a job submitted before a
-- restart could never be collected.
ALTER TABLE "Meeting" ADD COLUMN "transcriptJobId" TEXT;
ALTER TABLE "Meeting" ADD COLUMN "transcriptError" TEXT;
ALTER TABLE "Meeting" ADD COLUMN "createdById" TEXT;

CREATE INDEX "Meeting_transcriptStatus_idx" ON "Meeting"("transcriptStatus");
