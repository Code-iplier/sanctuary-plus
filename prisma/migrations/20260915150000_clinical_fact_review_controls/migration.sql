CREATE TYPE "ClinicalFactReviewStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'UNCERTAIN');

ALTER TABLE "ClinicalFact"
ADD COLUMN "reviewStatus" "ClinicalFactReviewStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "correctedValue" JSONB,
ADD COLUMN "reviewedAt" TIMESTAMP(3),
ADD COLUMN "reviewedBy" TEXT;
