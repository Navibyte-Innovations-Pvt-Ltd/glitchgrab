-- A one-time link that lets a client attach THEIR OWN Google Calendar.
--
-- The normal connect flow requires a Glitchgrab session, so it only ever works
-- for the account holder. The client whose demos we book has their own Gmail on
-- their own machine — this is how they connect it without being given a login
-- or sight of the dashboard.
--
-- Single-use and short-lived: an invite can only ADD a calendar to the one
-- project it was minted for, grants no read access, and dies when used.
CREATE TABLE "CalendarInvite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "repoId" TEXT NOT NULL,
    "label" TEXT,
    "usedAt" TIMESTAMP(3),
    "connectionId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CalendarInvite_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CalendarInvite_expiresAt_idx" ON "CalendarInvite"("expiresAt");

ALTER TABLE "CalendarInvite" ADD CONSTRAINT "CalendarInvite_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CalendarInvite" ADD CONSTRAINT "CalendarInvite_repoId_fkey"
    FOREIGN KEY ("repoId") REFERENCES "Repo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
