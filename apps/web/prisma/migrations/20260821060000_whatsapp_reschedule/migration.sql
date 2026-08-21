-- Thread is moving an existing booking rather than creating a new one.
-- Nullable and unconstrained on purpose: the booking it points at may be
-- cancelled or deleted while the picker is open, and a foreign key would then
-- block the cancellation rather than the reschedule.
ALTER TABLE "WhatsappThread" ADD COLUMN "rescheduleId" TEXT;
