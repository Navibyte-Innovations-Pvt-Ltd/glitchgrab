-- QA check: tester can mark an item SKIPPED (not testable right now) — no-op besides the status change

-- AlterEnum
ALTER TYPE "QaStatus" ADD VALUE IF NOT EXISTS 'SKIPPED';
