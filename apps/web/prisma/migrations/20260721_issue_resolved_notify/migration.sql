-- Delay reporter WhatsApp notify until the Vercel deploy is actually live (see /api/v1/cron/resolved-notify)

-- AlterTable
ALTER TABLE "Issue" ADD COLUMN     "resolvedAt" TIMESTAMP(3),
ADD COLUMN     "resolvedNotifiedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Issue_resolvedAt_resolvedNotifiedAt_idx" ON "Issue"("resolvedAt", "resolvedNotifiedAt");
