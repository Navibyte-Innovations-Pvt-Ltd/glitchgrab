-- Add WhatsApp phone to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "whatsappPhone" TEXT;

-- Create WhatsappOtp table for phone verification
CREATE TABLE "WhatsappOtp" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "phone"     TEXT NOT NULL,
    "otpHash"   TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsappOtp_pkey" PRIMARY KEY ("id")
);

-- Index for fast lookup by userId
CREATE INDEX "WhatsappOtp_userId_idx" ON "WhatsappOtp"("userId");

-- Foreign key to User
ALTER TABLE "WhatsappOtp" ADD CONSTRAINT "WhatsappOtp_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
