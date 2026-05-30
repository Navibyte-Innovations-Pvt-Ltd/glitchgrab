-- CreateTable
CREATE TABLE "CaptureSession" (
    "id" TEXT NOT NULL,
    "events" JSONB NOT NULL,
    "script" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaptureSession_pkey" PRIMARY KEY ("id")
);

-- Index for cleanup queries (delete expired sessions)
CREATE INDEX "CaptureSession_expiresAt_idx" ON "CaptureSession"("expiresAt");
