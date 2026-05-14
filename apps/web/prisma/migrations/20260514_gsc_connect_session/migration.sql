CREATE TABLE "GscConnectSession" (
  "id"               TEXT NOT NULL,
  "userId"           TEXT NOT NULL,
  "encryptedAccess"  TEXT NOT NULL,
  "encryptedRefresh" TEXT,
  "tokenExpiresAt"   TIMESTAMP(3) NOT NULL,
  "sites"            JSONB NOT NULL,
  "expiresAt"        TIMESTAMP(3) NOT NULL,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GscConnectSession_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "GscConnectSession" ADD CONSTRAINT "GscConnectSession_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
