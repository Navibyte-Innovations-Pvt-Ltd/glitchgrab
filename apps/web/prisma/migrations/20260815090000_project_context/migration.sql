-- Project context (#311 Phase A) — per-project memory.
-- RepoMember is the access gate and lands in the SAME migration as the data it
-- protects: context must never exist without a way to scope who can read it.

CREATE TYPE "ContextKind" AS ENUM ('DECISION', 'REQUEST', 'COMPLAINT', 'COMMITMENT', 'FACT');
CREATE TYPE "ContextSourceType" AS ENUM ('MEETING', 'REPORT', 'CAPTURE', 'QA', 'MANUAL');

-- Explicit user ↔ repo grant. Org membership alone does NOT grant context
-- access; the repo owner (Repo.userId) is implicit and needs no row.
CREATE TABLE "RepoMember" (
    "id" TEXT NOT NULL,
    "repoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "grantedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepoMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RepoMember_repoId_userId_key" ON "RepoMember"("repoId", "userId");
CREATE INDEX "RepoMember_userId_idx" ON "RepoMember"("userId");

ALTER TABLE "RepoMember" ADD CONSTRAINT "RepoMember_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "Repo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RepoMember" ADD CONSTRAINT "RepoMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- One distilled fact about a project.
CREATE TABLE "ProjectContextItem" (
    "id" TEXT NOT NULL,
    "repoId" TEXT NOT NULL,
    "kind" "ContextKind" NOT NULL,
    "text" TEXT NOT NULL,
    "sourceType" "ContextSourceType" NOT NULL,
    "sourceId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectContextItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProjectContextItem_repoId_occurredAt_idx" ON "ProjectContextItem"("repoId", "occurredAt");
CREATE INDEX "ProjectContextItem_repoId_kind_idx" ON "ProjectContextItem"("repoId", "kind");
CREATE INDEX "ProjectContextItem_sourceType_sourceId_idx" ON "ProjectContextItem"("sourceType", "sourceId");

ALTER TABLE "ProjectContextItem" ADD CONSTRAINT "ProjectContextItem_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "Repo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Client call. Stub for Phase B–E; nothing writes to it yet.
CREATE TABLE "Meeting" (
    "id" TEXT NOT NULL,
    "repoId" TEXT NOT NULL,
    "title" TEXT,
    "meetUrl" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "participants" JSONB,
    "status" TEXT,
    "recordingKey" TEXT,
    "transcript" TEXT,
    "transcriptStatus" TEXT,
    "calBookingUid" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Meeting_calBookingUid_key" ON "Meeting"("calBookingUid");
CREATE INDEX "Meeting_repoId_startsAt_idx" ON "Meeting"("repoId", "startsAt");

ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "Repo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Distillation stamps. A source is "done" because its row says so, not because
-- context items came out of it — a report can legitimately yield nothing, and
-- inferring from output would re-send those to the model on every press.
ALTER TABLE "Report" ADD COLUMN "contextDistilledAt" TIMESTAMP(3);
ALTER TABLE "QaCheck" ADD COLUMN "contextDistilledAt" TIMESTAMP(3);

CREATE INDEX "Report_repoId_contextDistilledAt_idx" ON "Report"("repoId", "contextDistilledAt");
CREATE INDEX "QaCheck_repoId_contextDistilledAt_idx" ON "QaCheck"("repoId", "contextDistilledAt");
