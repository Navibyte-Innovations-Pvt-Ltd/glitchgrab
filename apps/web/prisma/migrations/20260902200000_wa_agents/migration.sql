-- WhatsApp platform phase 5: inbox seats.
-- See agent_docs/whatsapp-platform.md

CREATE TYPE "WaAgentRole" AS ENUM ('AGENT', 'ADMIN');

CREATE TABLE "WaAgent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalAgentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "role" "WaAgentRole" NOT NULL DEFAULT 'AGENT',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WaAgent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WaAgent_tenantId_externalAgentId_key" ON "WaAgent"("tenantId", "externalAgentId");
CREATE INDEX "WaAgent_tenantId_active_idx" ON "WaAgent"("tenantId", "active");
ALTER TABLE "WaAgent" ADD CONSTRAINT "WaAgent_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "WaTenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
