-- Track map for meeting transcription (#311 Phase C).
--
-- Sarvam names batch results positionally ("0.json", "1.json"), so a result
-- cannot be attributed to a speaker by filename. This records the order the
-- files were submitted in — plus how much later each recorder actually started,
-- since the two MediaRecorders do not share a time origin.
ALTER TABLE "Meeting" ADD COLUMN "transcriptFiles" JSONB;
