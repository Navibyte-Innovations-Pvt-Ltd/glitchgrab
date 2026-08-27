-- Keep the assistant's chats, and join them to the reports they produced (#330).
--
-- The original feature deliberately stored no message bodies. That refusal made
-- one question unanswerable: how many prompts does a filed issue actually cost.
-- `turns` counted round-trips, but nothing linked a conversation to a report, so
-- the chats that ended in an issue could not be told from the ones that went
-- nowhere. Both halves together are the training set for the next prompt.

-- Who was typing. The credential columns above (`tokenId`/`userId`/`testerId`)
-- identify the KEY; one SDK token covers every end user of the host app, so
-- without these a thousand strangers' chats attribute to a single caller.
ALTER TABLE "AiAssistConversation" ADD COLUMN "reporterKey" TEXT;
ALTER TABLE "AiAssistConversation" ADD COLUMN "reporterName" TEXT;
ALTER TABLE "AiAssistConversation" ADD COLUMN "reporterEmail" TEXT;

-- How the conversation ended: "SOLVED" (the project's GLITCH.md brief answered
-- it, nothing filed) or "FILED". Present in schema.prisma since the brief work
-- but never carried by a migration — IF NOT EXISTS so a database that got it
-- through `db:push` applies this file cleanly.
ALTER TABLE "AiAssistConversation" ADD COLUMN IF NOT EXISTS "outcome" TEXT;

-- Every message of every chat, both sides, in order. Written best-effort AFTER
-- the reply is computed: a reporter is waiting, and a training insert must never
-- be what fails their turn.
CREATE TABLE "AiAssistMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    -- "user" | "assistant"
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    -- 1-based model round-trip. The user message and the reply it produced share
    -- a turn, which is what makes "prompts per issue" countable without
    -- re-deriving it from timestamps.
    "turn" INTEGER NOT NULL,
    -- Whether the model could see the screenshot. The image itself is never
    -- stored — it is megabytes of base64 per turn and the only signal in it is
    -- that it was there.
    "hadScreenshot" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiAssistMessage_pkey" PRIMARY KEY ("id")
);

-- Reading a transcript is "this conversation, in order".
CREATE INDEX "AiAssistMessage_conversationId_createdAt_idx" ON "AiAssistMessage"("conversationId", "createdAt");

ALTER TABLE "AiAssistMessage" ADD CONSTRAINT "AiAssistMessage_conversationId_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "AiAssistConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- The join. Null for every report typed by hand — which is what makes the
-- measurement possible: linked rows carry the turn count that produced an issue,
-- unlinked rows are the baseline. SET NULL rather than CASCADE: pruning old
-- transcripts must never delete the reports that came out of them.
ALTER TABLE "Report" ADD COLUMN "aiAssistConversationId" TEXT;

CREATE INDEX "Report_aiAssistConversationId_idx" ON "Report"("aiAssistConversationId");

ALTER TABLE "Report" ADD CONSTRAINT "Report_aiAssistConversationId_fkey"
    FOREIGN KEY ("aiAssistConversationId") REFERENCES "AiAssistConversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
