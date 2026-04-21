-- Add signature column + index for SDK_AUTO error dedup.
-- Hash of errorMessage + pageUrl-pathname + top stack frame.
-- Used by /api/v1/sdk/report to collapse duplicate crash reports within a 1h window.

-- AlterTable
ALTER TABLE "Report" ADD COLUMN "signature" TEXT;

-- CreateIndex
CREATE INDEX "Report_repoId_signature_createdAt_idx" ON "Report"("repoId", "signature", "createdAt");
