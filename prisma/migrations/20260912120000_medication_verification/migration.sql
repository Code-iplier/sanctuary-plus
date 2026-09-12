-- Patient-submitted medications remain unverified until staff review.
CREATE TYPE "MedicationVerificationStatus" AS ENUM ('UNVERIFIED', 'VERIFIED', 'REJECTED');

ALTER TABLE "Medication"
ADD COLUMN "verificationStatus" "MedicationVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED';
