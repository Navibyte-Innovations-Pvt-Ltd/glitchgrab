-- Demo booking from the SDK dialog — replaces cal.com.
--
-- A visitor on the customer's own site opens a Glitchgrab dialog, picks a slot
-- from the project owner's real Google availability, and verifies their
-- WhatsApp number. Only then is the event created on the owner's calendar.
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'EXPIRED');

CREATE TABLE "BookingPage" (
    "id" TEXT NOT NULL,
    "repoId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "slotMinutes" INTEGER NOT NULL DEFAULT 30,
    "bufferMinutes" INTEGER NOT NULL DEFAULT 15,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "workingHours" JSONB,
    "title" TEXT,
    "description" TEXT,
    "horizonDays" INTEGER NOT NULL DEFAULT 21,
    "noticeMinutes" INTEGER NOT NULL DEFAULT 120,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BookingPage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BookingPage_repoId_key" ON "BookingPage"("repoId");

ALTER TABLE "BookingPage" ADD CONSTRAINT "BookingPage_repoId_fkey"
    FOREIGN KEY ("repoId") REFERENCES "Repo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "repoId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT,
    "note" TEXT,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "otpHash" TEXT,
    "otpSentAt" TIMESTAMP(3),
    "otpExpires" TIMESTAMP(3),
    "otpAttempts" INTEGER NOT NULL DEFAULT 0,
    "calendarEventId" TEXT,
    "meetUrl" TEXT,
    "meetingId" TEXT,
    "reminderSentAt" TIMESTAMP(3),
    "ownerNotifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Booking_status_startsAt_idx" ON "Booking"("status", "startsAt");
CREATE INDEX "Booking_repoId_startsAt_idx" ON "Booking"("repoId", "startsAt");

-- The database decides who won a race for the last 3pm slot, not the
-- availability query — that answer is always a moment out of date.
--
-- Partial on purpose: only a PENDING hold or a CONFIRMED booking occupies a
-- slot. Cancelled and expired rows pile up at the same time quite legitimately,
-- and a plain unique constraint would reject the second cancellation forever.
CREATE UNIQUE INDEX "Booking_live_slot_key" ON "Booking"("repoId", "startsAt")
    WHERE "status" IN ('PENDING', 'CONFIRMED');

ALTER TABLE "Booking" ADD CONSTRAINT "Booking_pageId_fkey"
    FOREIGN KEY ("pageId") REFERENCES "BookingPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_repoId_fkey"
    FOREIGN KEY ("repoId") REFERENCES "Repo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
