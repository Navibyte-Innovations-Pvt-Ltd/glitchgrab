-- Org-scoped config (dashboard → org migration)
--
-- Subscription, Webhook, CalendarConnection and the WhatsApp digest fields all
-- hung off User. They now hang off Organization, because the org is the unit
-- that is billed, addressed and shared. Every step below is written so a
-- half-deployed release still reads: the legacy userId columns survive as
-- nullable, and no owner column is dropped here.
--
-- Rows whose owner has no organization cannot be backfilled. They are deleted
-- rather than orphaned — see each step. Take a snapshot before running this.

-- ── Organization gains the personal-config fields ────────────────────────────
ALTER TABLE "Organization"
  ADD COLUMN IF NOT EXISTS "whatsappPhone"    TEXT,
  ADD COLUMN IF NOT EXISTS "digestMutedUntil" TIMESTAMP(3);

-- Carry the owner's number onto each org they own. An owner with several orgs
-- seeds all of them with the same number; they can change it per org after.
UPDATE "Organization" o
SET "whatsappPhone"    = u."whatsappPhone",
    "digestMutedUntil" = u."digestMutedUntil"
FROM "User" u
WHERE u."id" = o."ownerId"
  AND o."whatsappPhone" IS NULL;

-- ── Subscription ─────────────────────────────────────────────────────────────
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "orgId" TEXT;

-- Backfill to the org this user owns. Oldest org wins when there are several,
-- so the result is stable across re-runs.
UPDATE "Subscription" s
SET "orgId" = (
  SELECT o."id" FROM "Organization" o
  WHERE o."ownerId" = s."userId"
  ORDER BY o."createdAt" ASC
  LIMIT 1
)
WHERE s."orgId" IS NULL;

-- A subscription whose owner never made an org has nowhere to live. Razorpay is
-- untouched by this delete: the plan keeps billing on Razorpay's side, and
-- /api/v1/billing/verify re-creates the row once that user has an org.
DELETE FROM "Subscription" WHERE "orgId" IS NULL;

ALTER TABLE "Subscription" ALTER COLUMN "orgId" SET NOT NULL;
ALTER TABLE "Subscription" ALTER COLUMN "userId" DROP NOT NULL;

ALTER TABLE "Subscription" DROP CONSTRAINT IF EXISTS "Subscription_userId_fkey";
ALTER TABLE "Subscription"
  ADD CONSTRAINT "Subscription_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_orgId_key" ON "Subscription"("orgId");
ALTER TABLE "Subscription"
  ADD CONSTRAINT "Subscription_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Webhook ──────────────────────────────────────────────────────────────────
ALTER TABLE "Webhook" ADD COLUMN IF NOT EXISTS "orgId" TEXT;

UPDATE "Webhook" w
SET "orgId" = (
  SELECT o."id" FROM "Organization" o
  WHERE o."ownerId" = w."userId"
  ORDER BY o."createdAt" ASC
  LIMIT 1
)
WHERE w."orgId" IS NULL;

DELETE FROM "Webhook" WHERE "orgId" IS NULL;

ALTER TABLE "Webhook" ALTER COLUMN "orgId" SET NOT NULL;
ALTER TABLE "Webhook" ALTER COLUMN "userId" DROP NOT NULL;

ALTER TABLE "Webhook" DROP CONSTRAINT IF EXISTS "Webhook_userId_fkey";
ALTER TABLE "Webhook"
  ADD CONSTRAINT "Webhook_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Webhook_orgId_idx" ON "Webhook"("orgId");
ALTER TABLE "Webhook"
  ADD CONSTRAINT "Webhook_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── CalendarConnection ───────────────────────────────────────────────────────
ALTER TABLE "CalendarConnection" ADD COLUMN IF NOT EXISTS "orgId" TEXT;

UPDATE "CalendarConnection" c
SET "orgId" = (
  SELECT o."id" FROM "Organization" o
  WHERE o."ownerId" = c."userId"
  ORDER BY o."createdAt" ASC
  LIMIT 1
)
WHERE c."orgId" IS NULL;

-- Deleting cascades to ScheduledRecording and BookingPage, which is correct: a
-- booking page pointing at a calendar nobody can reach is a broken link.
DELETE FROM "CalendarConnection" WHERE "orgId" IS NULL;

-- The old uniqueness was (userId, googleEmail). Two owners in one org who both
-- connected the same Google account would now collide, so collapse to the
-- oldest row before the new index goes on.
DELETE FROM "CalendarConnection" a
USING "CalendarConnection" b
WHERE a."orgId" = b."orgId"
  AND a."googleEmail" = b."googleEmail"
  AND a."createdAt" > b."createdAt";

ALTER TABLE "CalendarConnection" ALTER COLUMN "orgId" SET NOT NULL;
ALTER TABLE "CalendarConnection" ALTER COLUMN "userId" DROP NOT NULL;

ALTER TABLE "CalendarConnection" DROP CONSTRAINT IF EXISTS "CalendarConnection_userId_fkey";
ALTER TABLE "CalendarConnection"
  ADD CONSTRAINT "CalendarConnection_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

DROP INDEX IF EXISTS "CalendarConnection_userId_googleEmail_key";
CREATE UNIQUE INDEX IF NOT EXISTS "CalendarConnection_orgId_googleEmail_key"
  ON "CalendarConnection"("orgId", "googleEmail");
CREATE INDEX IF NOT EXISTS "CalendarConnection_userId_idx" ON "CalendarConnection"("userId");
ALTER TABLE "CalendarConnection"
  ADD CONSTRAINT "CalendarConnection_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── User sheds only what actually moved ──────────────────────────────────────
--
-- User.whatsappPhone STAYS. The digest is org business and now reads the org
-- number, but "you were assigned #12" (api/v1/github/webhook, looked up by
-- GitHub login) and booking reminders address a person, not a company. Two
-- jobs, two columns.
ALTER TABLE "User" DROP COLUMN IF EXISTS "digestMutedUntil";
