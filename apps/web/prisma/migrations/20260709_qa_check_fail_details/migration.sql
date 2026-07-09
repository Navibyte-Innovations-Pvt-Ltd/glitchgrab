-- Persist the tester's fail reason + screenshot on the QaCheck row (previously only posted to GitHub, never stored)

-- AlterTable
ALTER TABLE "QaCheck" ADD COLUMN     "failReason" TEXT,
ADD COLUMN     "failScreenshotUrl" TEXT;
