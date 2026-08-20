-- Which Google account each project's demos are booked into.
--
-- One Glitchgrab account can hold several clients' calendars — PracticeStack's
-- demos belong on the PracticeStack calendar, not on whichever account happened
-- to be connected first, which is what booking picked until now.
--
-- Nullable: a single-calendar setup keeps working untouched and falls back to
-- the oldest connection.
ALTER TABLE "BookingPage" ADD COLUMN "calendarConnectionId" TEXT;

ALTER TABLE "BookingPage" ADD CONSTRAINT "BookingPage_calendarConnectionId_fkey"
    FOREIGN KEY ("calendarConnectionId") REFERENCES "CalendarConnection"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
