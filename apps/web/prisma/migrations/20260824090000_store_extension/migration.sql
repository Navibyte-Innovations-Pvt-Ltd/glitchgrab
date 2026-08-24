-- Chrome Web Store release watching (#332).
--
-- A submission's outcome arrives hours or days after the release workflow has
-- exited, so no CI job can ever report it. These rows are what a cron polls.

CREATE TYPE "ExtensionReviewState" AS ENUM ('DRAFT', 'IN_REVIEW', 'PUBLISHED', 'NEEDS_ATTENTION', 'UNKNOWN');

CREATE TABLE "StoreExtension" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "repoId" TEXT,
    "name" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "publisherId" TEXT NOT NULL,
    -- Service-account JSON, AES-256-GCM. A service account does not expire the
    -- way an OAuth refresh token does, which is why this is not a refresh token.
    "credentials" TEXT NOT NULL,
    "publishedVersion" TEXT,
    "submittedVersion" TEXT,
    "state" "ExtensionReviewState" NOT NULL DEFAULT 'UNKNOWN',
    "stateDetail" TEXT,
    -- The state someone was last told about. Without it, one review in progress
    -- sends the same WhatsApp every poll.
    "notifiedState" "ExtensionReviewState",
    "stateSince" TIMESTAMP(3),
    "lastCheckedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreExtension_pkey" PRIMARY KEY ("id")
);

-- One row per item per owner: re-registering the same extension must update it,
-- never create a second watcher that sends every message twice.
CREATE UNIQUE INDEX "StoreExtension_userId_itemId_key" ON "StoreExtension"("userId", "itemId");
CREATE INDEX "StoreExtension_state_idx" ON "StoreExtension"("state");

ALTER TABLE "StoreExtension" ADD CONSTRAINT "StoreExtension_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- The repo link is decoration: losing the project must not lose the extension.
ALTER TABLE "StoreExtension" ADD CONSTRAINT "StoreExtension_repoId_fkey"
    FOREIGN KEY ("repoId") REFERENCES "Repo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
