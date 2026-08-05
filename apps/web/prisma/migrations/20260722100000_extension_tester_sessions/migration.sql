-- Add EXTENSION_TESTER report source (extension-filed bug reports, #297)
ALTER TYPE "ReportSource" ADD VALUE 'EXTENSION_TESTER';

-- CreateTable
CREATE TABLE "ExtensionSession" (
    "id" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "repoId" TEXT NOT NULL,
    "testerName" TEXT NOT NULL,
    "testerEmail" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastPingAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExtensionSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExtensionSession_repoId_idx" ON "ExtensionSession"("repoId");

-- CreateIndex
CREATE INDEX "ExtensionSession_tokenId_idx" ON "ExtensionSession"("tokenId");

-- AddForeignKey
ALTER TABLE "ExtensionSession" ADD CONSTRAINT "ExtensionSession_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "ApiToken"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtensionSession" ADD CONSTRAINT "ExtensionSession_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "Repo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
