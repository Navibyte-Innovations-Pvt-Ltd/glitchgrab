-- Migrate COLLABORATOR reports to DASHBOARD_UPLOAD before dropping enum value
UPDATE "Report" SET source = 'DASHBOARD_UPLOAD' WHERE source = 'COLLABORATOR';

-- Drop collaborator tables (order matters: junction table first)
DROP TABLE IF EXISTS "CollaboratorRepo" CASCADE;
DROP TABLE IF EXISTS "Collaborator" CASCADE;

-- Drop collaborator status enum
DROP TYPE IF EXISTS "CollaboratorStatus";

-- Remove collaboratorId column from Report
ALTER TABLE "Report" DROP COLUMN IF EXISTS "collaboratorId";

-- Recreate ReportSource enum without COLLABORATOR value
ALTER TYPE "ReportSource" RENAME TO "ReportSource_old";
CREATE TYPE "ReportSource" AS ENUM ('SDK_AUTO', 'SDK_USER_REPORT', 'DASHBOARD_UPLOAD', 'HANDWRITTEN_NOTE', 'MCP');
ALTER TABLE "Report" ALTER COLUMN source TYPE "ReportSource" USING source::text::"ReportSource";
DROP TYPE "ReportSource_old";
