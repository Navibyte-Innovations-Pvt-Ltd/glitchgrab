-- WhatsApp platform phase 2: Embedded Signup onboarding, numbers, webhook dedupe.
-- See agent_docs/whatsapp-platform.md

CREATE TYPE "WaNumberStatus" AS ENUM ('PENDING', 'VERIFIED', 'REGISTERED', 'DISCONNECTED');

ALTER TABLE "WaTenant"
  ADD COLUMN "accessTokenEnc"   TEXT,
  ADD COLUMN "tokenExpiresAt"   TIMESTAMP(3),
  ADD COLUMN "creditLineShared" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "creditLineNote"   TEXT,
  ADD COLUMN "connectedAt"      TIMESTAMP(3);

CREATE TABLE "WaNumber" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "phoneNumberId" TEXT NOT NULL,
    "displayNumber" TEXT NOT NULL,
    "verifiedName" TEXT NOT NULL,
    "status" "WaNumberStatus" NOT NULL DEFAULT 'PENDING',
    "qualityRating" TEXT,
    "messagingLimitTier" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WaNumber_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WaNumber_phoneNumberId_key" ON "WaNumber"("phoneNumberId");
CREATE INDEX "WaNumber_tenantId_idx" ON "WaNumber"("tenantId");
ALTER TABLE "WaNumber" ADD CONSTRAINT "WaNumber_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "WaTenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "WaWebhookEvent" (
    "id" TEXT NOT NULL,
    "metaEventId" TEXT NOT NULL,
    "phoneNumberId" TEXT,
    "tenantId" TEXT,
    "field" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WaWebhookEvent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WaWebhookEvent_metaEventId_key" ON "WaWebhookEvent"("metaEventId");
CREATE INDEX "WaWebhookEvent_tenantId_createdAt_idx" ON "WaWebhookEvent"("tenantId", "createdAt");
CREATE INDEX "WaWebhookEvent_phoneNumberId_idx" ON "WaWebhookEvent"("phoneNumberId");
