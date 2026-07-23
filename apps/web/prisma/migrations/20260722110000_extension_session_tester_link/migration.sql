-- ExtensionSession.tokenId becomes nullable — QA-magic-link-originated
-- sessions have no gg_ ApiToken (#297 auto-login).
ALTER TABLE "ExtensionSession" ALTER COLUMN "tokenId" DROP NOT NULL;
