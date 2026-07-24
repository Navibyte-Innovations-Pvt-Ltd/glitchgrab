-- ExtensionSession gains testerId/userId (#297) — server-authoritative link
-- back to WHO auto-logged-in, so the extension's own repo picker/report
-- endpoint can enforce "tester sees only their assigned repos" instead of
-- trusting a client-supplied repoId.
ALTER TABLE "ExtensionSession" ADD COLUMN "testerId" TEXT;
ALTER TABLE "ExtensionSession" ADD COLUMN "userId" TEXT;

CREATE INDEX "ExtensionSession_testerId_idx" ON "ExtensionSession"("testerId");
CREATE INDEX "ExtensionSession_userId_idx" ON "ExtensionSession"("userId");

ALTER TABLE "ExtensionSession" ADD CONSTRAINT "ExtensionSession_testerId_fkey" FOREIGN KEY ("testerId") REFERENCES "Tester"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExtensionSession" ADD CONSTRAINT "ExtensionSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
