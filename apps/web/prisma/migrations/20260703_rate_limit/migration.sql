-- DB-backed rate limit counter (replaces broken in-memory Map, which reset per serverless instance)

-- CreateTable: RateLimit
CREATE TABLE IF NOT EXISTS "RateLimit" (
  "key" TEXT NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "resetAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);
CREATE INDEX IF NOT EXISTS "RateLimit_resetAt_idx" ON "RateLimit"("resetAt");
