-- End-user feedback (#309) — feedback the SDK consumer's own end-users leave
-- about the consumer's app, stored by Glitchgrab so the consumer writes zero
-- DB code. Never linked to a GitHub issue.
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "repoId" TEXT NOT NULL,
    "tokenId" TEXT,
    "rating" INTEGER NOT NULL,
    "message" TEXT,
    "pageUrl" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "reporterPrimaryKey" TEXT NOT NULL,
    "reporterName" TEXT NOT NULL,
    "reporterEmail" TEXT,
    "reporterPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Feedback_repoId_createdAt_idx" ON "Feedback"("repoId", "createdAt");
CREATE INDEX "Feedback_repoId_approved_idx" ON "Feedback"("repoId", "approved");
CREATE INDEX "Feedback_repoId_reporterPrimaryKey_idx" ON "Feedback"("repoId", "reporterPrimaryKey");

ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "Repo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "ApiToken"("id") ON DELETE SET NULL ON UPDATE CASCADE;
