-- GscProperty: stores Google Search Console OAuth connection per user/site
CREATE TABLE "GscProperty" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "siteUrl" TEXT NOT NULL,
    "repoId" TEXT,
    "encryptedAccessToken" TEXT NOT NULL,
    "encryptedRefreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "indexedCount" INTEGER NOT NULL DEFAULT 0,
    "notIndexedCount" INTEGER NOT NULL DEFAULT 0,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GscProperty_pkey" PRIMARY KEY ("id")
);

-- McpToken: user-level API tokens for the HTTP MCP endpoint
CREATE TABLE "McpToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'MCP Access',
    "lastUsed" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "McpToken_pkey" PRIMARY KEY ("id")
);

-- Unique constraints
CREATE UNIQUE INDEX "GscProperty_userId_siteUrl_key" ON "GscProperty"("userId", "siteUrl");
CREATE UNIQUE INDEX "McpToken_tokenHash_key" ON "McpToken"("tokenHash");

-- Foreign keys
ALTER TABLE "GscProperty" ADD CONSTRAINT "GscProperty_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GscProperty" ADD CONSTRAINT "GscProperty_repoId_fkey"
    FOREIGN KEY ("repoId") REFERENCES "Repo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "McpToken" ADD CONSTRAINT "McpToken_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
