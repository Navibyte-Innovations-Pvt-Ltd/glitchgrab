-- WhatsApp platform phase 3: templates and messages.
-- See agent_docs/whatsapp-platform.md

CREATE TYPE "WaTemplateStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'PAUSED', 'DISABLED');
CREATE TYPE "WaMessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');
CREATE TYPE "WaMessageStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED');

CREATE TABLE "WaTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "category" "WaTemplateCategory" NOT NULL,
    "components" JSONB NOT NULL,
    "metaTemplateId" TEXT,
    "status" "WaTemplateStatus" NOT NULL DEFAULT 'DRAFT',
    "rejectionReason" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WaTemplate_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WaTemplate_tenantId_name_language_key" ON "WaTemplate"("tenantId", "name", "language");
CREATE INDEX "WaTemplate_tenantId_status_idx" ON "WaTemplate"("tenantId", "status");
CREATE INDEX "WaTemplate_metaTemplateId_idx" ON "WaTemplate"("metaTemplateId");
ALTER TABLE "WaTemplate" ADD CONSTRAINT "WaTemplate_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "WaTenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "WaMessage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "direction" "WaMessageDirection" NOT NULL,
    "status" "WaMessageStatus" NOT NULL DEFAULT 'QUEUED',
    "contactPhone" TEXT NOT NULL,
    "phoneNumberId" TEXT,
    "templateId" TEXT,
    "category" "WaTemplateCategory",
    "metaMessageId" TEXT,
    "payload" JSONB NOT NULL,
    "error" TEXT,
    "tenantPricePaise" INTEGER,
    "platformPricePaise" INTEGER,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WaMessage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "WaMessage_tenantId_createdAt_idx" ON "WaMessage"("tenantId", "createdAt");
CREATE INDEX "WaMessage_metaMessageId_idx" ON "WaMessage"("metaMessageId");
CREATE INDEX "WaMessage_tenantId_contactPhone_createdAt_idx" ON "WaMessage"("tenantId", "contactPhone", "createdAt");
ALTER TABLE "WaMessage" ADD CONSTRAINT "WaMessage_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "WaTenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WaMessage" ADD CONSTRAINT "WaMessage_templateId_fkey"
    FOREIGN KEY ("templateId") REFERENCES "WaTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
