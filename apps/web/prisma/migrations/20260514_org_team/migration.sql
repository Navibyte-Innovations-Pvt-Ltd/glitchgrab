-- Add githubLogin to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "githubLogin" TEXT;

-- Create OrgRole enum
DO $$ BEGIN
  CREATE TYPE "OrgRole" AS ENUM ('OWNER', 'MEMBER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create Organization table
CREATE TABLE IF NOT EXISTS "Organization" (
  "id"             TEXT NOT NULL,
  "githubOrgLogin" TEXT NOT NULL,
  "githubOrgId"    INTEGER NOT NULL,
  "name"           TEXT NOT NULL,
  "ownerId"        TEXT NOT NULL,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Organization_githubOrgLogin_key" ON "Organization"("githubOrgLogin");
CREATE UNIQUE INDEX IF NOT EXISTS "Organization_githubOrgId_key"    ON "Organization"("githubOrgId");

ALTER TABLE "Organization"
  ADD CONSTRAINT "Organization_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create OrgMember table
CREATE TABLE IF NOT EXISTS "OrgMember" (
  "id"        TEXT NOT NULL,
  "orgId"     TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "role"      "OrgRole" NOT NULL DEFAULT 'MEMBER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "OrgMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "OrgMember_orgId_userId_key" ON "OrgMember"("orgId", "userId");

ALTER TABLE "OrgMember"
  ADD CONSTRAINT "OrgMember_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrgMember"
  ADD CONSTRAINT "OrgMember_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create OrgMemberRepo table
CREATE TABLE IF NOT EXISTS "OrgMemberRepo" (
  "id"          TEXT NOT NULL,
  "orgMemberId" TEXT NOT NULL,
  "repoId"      TEXT NOT NULL,

  CONSTRAINT "OrgMemberRepo_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "OrgMemberRepo_orgMemberId_repoId_key" ON "OrgMemberRepo"("orgMemberId", "repoId");

ALTER TABLE "OrgMemberRepo"
  ADD CONSTRAINT "OrgMemberRepo_orgMemberId_fkey"
  FOREIGN KEY ("orgMemberId") REFERENCES "OrgMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrgMemberRepo"
  ADD CONSTRAINT "OrgMemberRepo_repoId_fkey"
  FOREIGN KEY ("repoId") REFERENCES "Repo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add orgId to Repo
ALTER TABLE "Repo" ADD COLUMN IF NOT EXISTS "orgId" TEXT;

CREATE INDEX IF NOT EXISTS "Repo_orgId_idx" ON "Repo"("orgId");

ALTER TABLE "Repo"
  ADD CONSTRAINT "Repo_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
