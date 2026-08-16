-- Meet bot + Google Calendar auto-record (#311).
--
-- The bot is a second way to FILL the existing meeting pipeline: a headless
-- Chromium joins the call as a guest, records the audio, and uploads through
-- the same endpoints the extension uses. Same Meeting row, same Sarvam
-- transcription, same Calls page.
--
-- Google Calendar replaces cal.com outright: the meetings already live there
-- with a Meet link attached, so that IS the schedule.

ALTER TABLE "Meeting" ADD COLUMN "recorder" TEXT;
ALTER TABLE "Meeting" ADD COLUMN "botStatus" TEXT;
ALTER TABLE "Meeting" ADD COLUMN "botError" TEXT;

CREATE TYPE "ScheduledRecordingStatus" AS ENUM ('PENDING', 'DISPATCHED', 'SKIPPED', 'FAILED');

CREATE TABLE "CalendarConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "googleEmail" TEXT NOT NULL,
    "encryptedAccessToken" TEXT NOT NULL,
    "encryptedRefreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "defaultRepoId" TEXT,
    "autoRecord" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarConnection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CalendarConnection_userId_googleEmail_key" ON "CalendarConnection"("userId", "googleEmail");

ALTER TABLE "CalendarConnection" ADD CONSTRAINT "CalendarConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Keyed on the Google event id so the poller is idempotent — it runs every few
-- minutes and must never send two bots to the same call.
CREATE TABLE "ScheduledRecording" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "calendarEventId" TEXT NOT NULL,
    "repoId" TEXT,
    "title" TEXT,
    "meetUrl" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "attendees" JSONB,
    "status" "ScheduledRecordingStatus" NOT NULL DEFAULT 'PENDING',
    "meetingId" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledRecording_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ScheduledRecording_connectionId_calendarEventId_key" ON "ScheduledRecording"("connectionId", "calendarEventId");
CREATE INDEX "ScheduledRecording_status_startsAt_idx" ON "ScheduledRecording"("status", "startsAt");

ALTER TABLE "ScheduledRecording" ADD CONSTRAINT "ScheduledRecording_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "CalendarConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
