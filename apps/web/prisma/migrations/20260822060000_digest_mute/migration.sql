-- Mute window for WhatsApp digest nudges. Set when a user replies LEAVE.
ALTER TABLE "User" ADD COLUMN "digestMutedUntil" TIMESTAMP(3);
