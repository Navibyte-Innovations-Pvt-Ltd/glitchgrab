-- AI report assistant (#330).

-- The owner's opt-in switch. Off by default: the report dialog can be opened by
-- any end user of an SDK-embedded app, and nobody should discover they enabled
-- that by reading a bill.
ALTER TABLE "Repo" ADD COLUMN "aiAssistEnabled" BOOLEAN NOT NULL DEFAULT false;

-- One AI-assisted report composition. This is the row the monthly cap counts —
-- conversations, not messages — and it deliberately stores no message bodies.
CREATE TABLE "AiAssistConversation" (
    "id" TEXT NOT NULL,
    "repoId" TEXT NOT NULL,
    "turns" INTEGER NOT NULL DEFAULT 0,
    "tokenId" TEXT,
    "userId" TEXT,
    "testerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiAssistConversation_pkey" PRIMARY KEY ("id")
);

-- The cap query is "rows for this repo since the start of the month".
CREATE INDEX "AiAssistConversation_repoId_createdAt_idx" ON "AiAssistConversation"("repoId", "createdAt");

ALTER TABLE "AiAssistConversation" ADD CONSTRAINT "AiAssistConversation_repoId_fkey"
    FOREIGN KEY ("repoId") REFERENCES "Repo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
