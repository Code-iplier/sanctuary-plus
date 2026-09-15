-- Link intake facts to the patient statement that supplied the supporting evidence.
ALTER TABLE "ClinicalFact"
ADD CONSTRAINT "ClinicalFact_transcriptEntryId_fkey"
FOREIGN KEY ("transcriptEntryId") REFERENCES "TranscriptEntry"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
