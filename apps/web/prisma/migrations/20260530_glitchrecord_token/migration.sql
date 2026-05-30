-- Add meta column to CaptureSession (recording cuts from Recordly/GlitchRecord)
ALTER TABLE "CaptureSession" ADD COLUMN IF NOT EXISTS "meta" JSONB;

-- Create GlitchRecordToken table for desktop app auth
CREATE TABLE IF NOT EXISTS "GlitchRecordToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GlitchRecordToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "GlitchRecordToken_tokenHash_key" ON "GlitchRecordToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "GlitchRecordToken_userId_idx" ON "GlitchRecordToken"("userId");
CREATE INDEX IF NOT EXISTS "GlitchRecordToken_expiresAt_idx" ON "GlitchRecordToken"("expiresAt");

ALTER TABLE "GlitchRecordToken" ADD CONSTRAINT "GlitchRecordToken_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
