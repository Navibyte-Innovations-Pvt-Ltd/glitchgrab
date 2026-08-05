-- ExtensionSession.repoId becomes nullable — dashboard/admin auto-login and
-- QA-tester auto-login don't know a repo up front; it's backfilled once
-- GlitchRecord starts recording against a real repo (#297).
ALTER TABLE "ExtensionSession" ALTER COLUMN "repoId" DROP NOT NULL;
