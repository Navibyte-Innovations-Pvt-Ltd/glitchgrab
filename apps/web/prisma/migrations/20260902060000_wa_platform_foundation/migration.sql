-- WhatsApp platform foundation (phase 1): platforms, tenants, wallets, pricing.
-- See agent_docs/whatsapp-platform.md

CREATE TYPE "WaWalletOwnerType" AS ENUM ('PLATFORM', 'TENANT');
CREATE TYPE "WaWalletTxnKind" AS ENUM ('TOPUP', 'DEBIT', 'REFUND', 'HOLD', 'RELEASE', 'ADJUSTMENT');
CREATE TYPE "WaTemplateCategory" AS ENUM ('MARKETING', 'UTILITY', 'AUTHENTICATION', 'SERVICE');
CREATE TYPE "WaTenantStatus" AS ENUM ('PENDING', 'CONNECTED', 'SUSPENDED', 'DISCONNECTED');

CREATE TABLE "WaPlatform" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "apiKeyHash" TEXT NOT NULL,
    "callbackUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WaPlatform_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WaPlatform_slug_key" ON "WaPlatform"("slug");
CREATE UNIQUE INDEX "WaPlatform_apiKeyHash_key" ON "WaPlatform"("apiKeyHash");

CREATE TABLE "WaTenant" (
    "id" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "externalOwnerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "wabaId" TEXT,
    "status" "WaTenantStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WaTenant_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WaTenant_platformId_externalOwnerId_key" ON "WaTenant"("platformId", "externalOwnerId");
CREATE INDEX "WaTenant_wabaId_idx" ON "WaTenant"("wabaId");
ALTER TABLE "WaTenant" ADD CONSTRAINT "WaTenant_platformId_fkey"
    FOREIGN KEY ("platformId") REFERENCES "WaPlatform"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "WaWallet" (
    "id" TEXT NOT NULL,
    "ownerType" "WaWalletOwnerType" NOT NULL,
    "ownerId" TEXT NOT NULL,
    "balancePaise" INTEGER NOT NULL DEFAULT 0,
    "heldPaise" INTEGER NOT NULL DEFAULT 0,
    "lowBalanceThresholdPaise" INTEGER NOT NULL DEFAULT 0,
    "lowBalanceNotifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WaWallet_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WaWallet_ownerType_ownerId_key" ON "WaWallet"("ownerType", "ownerId");

-- A wallet must never go negative or reserve more than it holds. The atomic
-- conditional UPDATE in lib/wa/wallet.ts is the primary guard; these are the
-- backstop for any code path that forgets.
ALTER TABLE "WaWallet" ADD CONSTRAINT "WaWallet_balance_non_negative" CHECK ("balancePaise" >= 0);
ALTER TABLE "WaWallet" ADD CONSTRAINT "WaWallet_held_within_balance" CHECK ("heldPaise" >= 0 AND "heldPaise" <= "balancePaise");

CREATE TABLE "WaWalletTxn" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "kind" "WaWalletTxnKind" NOT NULL,
    "balanceAfterPaise" INTEGER NOT NULL,
    "messageId" TEXT,
    "broadcastId" TEXT,
    "refKey" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WaWalletTxn_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WaWalletTxn_refKey_key" ON "WaWalletTxn"("refKey");
CREATE INDEX "WaWalletTxn_walletId_createdAt_idx" ON "WaWalletTxn"("walletId", "createdAt");
ALTER TABLE "WaWalletTxn" ADD CONSTRAINT "WaWalletTxn_walletId_fkey"
    FOREIGN KEY ("walletId") REFERENCES "WaWallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "WaPriceRule" (
    "id" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "category" "WaTemplateCategory" NOT NULL,
    "metaCostPaise" INTEGER NOT NULL,
    "platformPricePaise" INTEGER NOT NULL,
    "tenantPricePaise" INTEGER NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WaPriceRule_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WaPriceRule_platformId_category_effectiveFrom_key" ON "WaPriceRule"("platformId", "category", "effectiveFrom");
CREATE INDEX "WaPriceRule_platformId_category_idx" ON "WaPriceRule"("platformId", "category");
ALTER TABLE "WaPriceRule" ADD CONSTRAINT "WaPriceRule_platformId_fkey"
    FOREIGN KEY ("platformId") REFERENCES "WaPlatform"("id") ON DELETE CASCADE ON UPDATE CASCADE;
