ALTER TABLE "GscProperty" ADD COLUMN IF NOT EXISTS "cachedNotIndexedPages" JSONB;
ALTER TABLE "GscProperty" ADD COLUMN IF NOT EXISTS "seoHealthIssueUrl" TEXT;
