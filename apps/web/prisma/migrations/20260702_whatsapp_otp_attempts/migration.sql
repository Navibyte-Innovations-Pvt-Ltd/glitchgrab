-- Track failed OTP verify attempts to lock out brute-force guessing
ALTER TABLE "WhatsappOtp" ADD COLUMN IF NOT EXISTS "attempts" INTEGER NOT NULL DEFAULT 0;
