-- WhatsApp platform phase 4: conversations, the 24-hour window, autoreply, opt-out.
-- See agent_docs/whatsapp-platform.md

CREATE TYPE "WaMatchType" AS ENUM ('EXACT', 'CONTAINS', 'STARTS_WITH', 'REGEX', 'ANY');
CREATE TYPE "WaConversationStatus" AS ENUM ('OPEN', 'SNOOZED', 'CLOSED');

CREATE TABLE "WaConversation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "contactName" TEXT,
    "windowExpiresAt" TIMESTAMP(3),
    "lastInboundAt" TIMESTAMP(3),
    "lastOutboundAt" TIMESTAMP(3),
    "optedOut" BOOLEAN NOT NULL DEFAULT false,
    "optedOutAt" TIMESTAMP(3),
    "status" "WaConversationStatus" NOT NULL DEFAULT 'OPEN',
    "assignedAgentId" TEXT,
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WaConversation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WaConversation_tenantId_contactPhone_key" ON "WaConversation"("tenantId", "contactPhone");
CREATE INDEX "WaConversation_tenantId_status_updatedAt_idx" ON "WaConversation"("tenantId", "status", "updatedAt");
CREATE INDEX "WaConversation_tenantId_windowExpiresAt_idx" ON "WaConversation"("tenantId", "windowExpiresAt");
ALTER TABLE "WaConversation" ADD CONSTRAINT "WaConversation_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "WaTenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "WaAutoreplyRule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "matchType" "WaMatchType" NOT NULL DEFAULT 'CONTAINS',
    "pattern" TEXT,
    "replyText" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "matchCount" INTEGER NOT NULL DEFAULT 0,
    "lastMatchAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WaAutoreplyRule_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "WaAutoreplyRule_tenantId_enabled_priority_idx" ON "WaAutoreplyRule"("tenantId", "enabled", "priority");
ALTER TABLE "WaAutoreplyRule" ADD CONSTRAINT "WaAutoreplyRule_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "WaTenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WaMessage" ADD COLUMN "conversationId" TEXT;
CREATE INDEX "WaMessage_conversationId_createdAt_idx" ON "WaMessage"("conversationId", "createdAt");
ALTER TABLE "WaMessage" ADD CONSTRAINT "WaMessage_conversationId_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "WaConversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
