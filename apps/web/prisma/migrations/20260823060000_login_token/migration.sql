-- Single-use auto-login token behind the WhatsApp digest's "Open dashboard" button.
CREATE TABLE "LoginToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetPath" TEXT NOT NULL DEFAULT '/dashboard',
    "purpose" TEXT NOT NULL DEFAULT 'DIGEST_DEEPLINK',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LoginToken_token_key" ON "LoginToken"("token");
CREATE INDEX "LoginToken_token_idx" ON "LoginToken"("token");
CREATE INDEX "LoginToken_userId_createdAt_idx" ON "LoginToken"("userId", "createdAt");

ALTER TABLE "LoginToken" ADD CONSTRAINT "LoginToken_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
