-- QA / Tester workflow: external testers verify developer fixes via magic-link + WhatsApp

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "QaStatus" AS ENUM ('PENDING', 'PASS', 'FAIL');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- CreateTable: Tester
CREATE TABLE IF NOT EXISTS "Tester" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "magicToken" TEXT NOT NULL,
  "invitedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Tester_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Tester_magicToken_key" ON "Tester"("magicToken");
CREATE INDEX IF NOT EXISTS "Tester_orgId_idx" ON "Tester"("orgId");

-- CreateTable: TesterRepo
CREATE TABLE IF NOT EXISTS "TesterRepo" (
  "id" TEXT NOT NULL,
  "testerId" TEXT NOT NULL,
  "repoId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TesterRepo_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "TesterRepo_testerId_repoId_key" ON "TesterRepo"("testerId", "repoId");
CREATE INDEX IF NOT EXISTS "TesterRepo_repoId_idx" ON "TesterRepo"("repoId");

-- CreateTable: QaCheck
CREATE TABLE IF NOT EXISTS "QaCheck" (
  "id" TEXT NOT NULL,
  "testerId" TEXT NOT NULL,
  "repoId" TEXT NOT NULL,
  "githubNumber" INTEGER NOT NULL,
  "githubUrl" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "prNumber" INTEGER,
  "prUrl" TEXT,
  "developerLogin" TEXT,
  "status" "QaStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "verifiedAt" TIMESTAMP(3),
  CONSTRAINT "QaCheck_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "QaCheck_testerId_repoId_githubNumber_prNumber_key" ON "QaCheck"("testerId", "repoId", "githubNumber", "prNumber");
CREATE INDEX IF NOT EXISTS "QaCheck_testerId_status_idx" ON "QaCheck"("testerId", "status");
CREATE INDEX IF NOT EXISTS "QaCheck_repoId_githubNumber_idx" ON "QaCheck"("repoId", "githubNumber");

-- FKs
ALTER TABLE "Tester" ADD CONSTRAINT "Tester_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TesterRepo" ADD CONSTRAINT "TesterRepo_testerId_fkey" FOREIGN KEY ("testerId") REFERENCES "Tester"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TesterRepo" ADD CONSTRAINT "TesterRepo_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "Repo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QaCheck" ADD CONSTRAINT "QaCheck_testerId_fkey" FOREIGN KEY ("testerId") REFERENCES "Tester"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QaCheck" ADD CONSTRAINT "QaCheck_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "Repo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: TesterOtp (WhatsApp OTP login for testers)
CREATE TABLE IF NOT EXISTS "TesterOtp" (
  "id" TEXT NOT NULL,
  "testerId" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "otpHash" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TesterOtp_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "TesterOtp_testerId_idx" ON "TesterOtp"("testerId");
ALTER TABLE "TesterOtp" ADD CONSTRAINT "TesterOtp_testerId_fkey" FOREIGN KEY ("testerId") REFERENCES "Tester"("id") ON DELETE CASCADE ON UPDATE CASCADE;
