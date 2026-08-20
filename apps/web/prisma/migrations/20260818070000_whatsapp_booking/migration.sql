-- Booking over WhatsApp, and the client behind it.
--
-- A visitor taps "Book on WhatsApp" on the customer's site, lands in chat with
-- a prefilled message naming the project, and the bot walks them through date
-- and time. Because THEY message first, Meta's 24-hour window applies and the
-- conversation itself needs no approved templates.
CREATE TYPE "WhatsappThreadStep" AS ENUM (
    'CHOOSE_PROJECT', 'CHOOSE_DATE', 'CHOOSE_TIME', 'ASK_NAME', 'ASK_EMAIL', 'DONE'
);

CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Client_phone_key" ON "Client"("phone");

CREATE TABLE "ClientProject" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "repoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClientProject_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ClientProject_clientId_repoId_key" ON "ClientProject"("clientId", "repoId");

ALTER TABLE "ClientProject" ADD CONSTRAINT "ClientProject_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClientProject" ADD CONSTRAINT "ClientProject_repoId_fkey"
    FOREIGN KEY ("repoId") REFERENCES "Repo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- WhatsApp carries no session of its own: every inbound message is a number
-- and some text. Without this the bot forgets what it just asked.
CREATE TABLE "WhatsappThread" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "step" "WhatsappThreadStep" NOT NULL DEFAULT 'CHOOSE_PROJECT',
    "repoId" TEXT,
    "pendingStart" TIMESTAMP(3),
    "datePage" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT,
    "email" TEXT,
    "lastInboundAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bookingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WhatsappThread_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WhatsappThread_phone_key" ON "WhatsappThread"("phone");
CREATE INDEX "WhatsappThread_step_updatedAt_idx" ON "WhatsappThread"("step", "updatedAt");

-- The code that appears in the wa.me deep link, so an inbound "demo
-- practicestack" already knows which project it means.
ALTER TABLE "BookingPage" ADD COLUMN "whatsappCode" TEXT;
CREATE UNIQUE INDEX "BookingPage_whatsappCode_key" ON "BookingPage"("whatsappCode");

ALTER TABLE "Booking" ADD COLUMN "clientId" TEXT;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
