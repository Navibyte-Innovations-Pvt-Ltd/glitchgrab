-- Public no-auth tester report link, scoped to an ApiToken

ALTER TABLE "ApiToken" ADD COLUMN IF NOT EXISTS "shareSlug" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "ApiToken_shareSlug_key" ON "ApiToken"("shareSlug");

ALTER TYPE "ReportSource" ADD VALUE IF NOT EXISTS 'PUBLIC_LINK';
