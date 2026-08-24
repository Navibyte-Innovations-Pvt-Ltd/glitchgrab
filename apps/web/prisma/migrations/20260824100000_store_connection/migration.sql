-- Connect-a-Google-account instead of pasting a key file (#332).
--
-- The service-account path needed a downloaded private key AND a *group*
-- publisher account — which a personal publisher account simply does not have,
-- making it a dead end rather than a chore. A connection covers every extension
-- on the account, so adding the second extension is two ids and nothing else.

CREATE TABLE "StoreConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "googleEmail" TEXT NOT NULL,
    -- OAuth refresh token, AES-256-GCM. Access tokens last an hour; this is
    -- what survives, and it is as sensitive as the account's store access.
    "refreshToken" TEXT NOT NULL,
    -- Set when Google stops accepting it: revoked, or the consent screen was
    -- left in Testing, where refresh tokens expire after 7 days.
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreConnection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StoreConnection_userId_googleEmail_key" ON "StoreConnection"("userId", "googleEmail");

ALTER TABLE "StoreConnection" ADD CONSTRAINT "StoreConnection_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Swap the stored key file for the connection that replaces it. The previous
-- migration shipped hours ago and holds no rows anywhere, so this drops rather
-- than migrates: there is no key to preserve.
ALTER TABLE "StoreExtension" DROP COLUMN "credentials";
ALTER TABLE "StoreExtension" ADD COLUMN "connectionId" TEXT NOT NULL;

CREATE INDEX "StoreExtension_connectionId_idx" ON "StoreExtension"("connectionId");

-- Losing the connection loses the ability to read those items at all, so the
-- rows go with it rather than lingering as permanently unreadable.
ALTER TABLE "StoreExtension" ADD CONSTRAINT "StoreExtension_connectionId_fkey"
    FOREIGN KEY ("connectionId") REFERENCES "StoreConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
