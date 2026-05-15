-- Drop OrgMemberRepo: member repo access is now fetched live from GitHub API, not stored in DB
-- Repos in the Repo table and their orgId assignments are untouched

DROP TABLE IF EXISTS "OrgMemberRepo";
