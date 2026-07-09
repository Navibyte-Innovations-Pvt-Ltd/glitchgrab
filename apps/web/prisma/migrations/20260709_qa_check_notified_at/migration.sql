-- Delay tester WhatsApp notify until the Vercel deploy is actually live (see /api/v1/cron/qa-notify)

-- AlterTable
ALTER TABLE "QaCheck" ADD COLUMN     "notifiedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "QaCheck_notifiedAt_idx" ON "QaCheck"("notifiedAt");
