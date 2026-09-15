-- Synthetic patient cohort and external-style clinical documents for the
-- local integration environment. This migration does not connect to ABDM or
-- create ABHA identities; it only provides durable test records.

ALTER TABLE "Patient"
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "dateOfBirth" TIMESTAMP(3),
  ADD COLUMN "gender" TEXT,
  ADD COLUMN "bloodGroup" TEXT,
  ADD COLUMN "preferredLanguage" TEXT,
  ADD COLUMN "address" TEXT,
  ADD COLUMN "emergencyContactName" TEXT,
  ADD COLUMN "emergencyContactPhone" TEXT,
  ADD COLUMN "isSynthetic" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "Patient_phone_key" ON "Patient"("phone");

CREATE TYPE "ClinicalDocumentType" AS ENUM (
  'LAB_REPORT',
  'PRESCRIPTION',
  'DISCHARGE_SUMMARY',
  'IMAGING_REPORT',
  'REFERRAL',
  'IMMUNIZATION_RECORD',
  'AYUSH_CONSULTATION'
);

CREATE TYPE "ClinicalDocumentStatus" AS ENUM (
  'RECEIVED',
  'OCR_REVIEWED',
  'CLINICIAN_VERIFIED'
);

CREATE TABLE "ClinicalDocument" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "encounterId" TEXT,
  "documentType" "ClinicalDocumentType" NOT NULL,
  "title" TEXT NOT NULL,
  "sourceOrganization" TEXT NOT NULL,
  "sourceSystem" TEXT NOT NULL,
  "documentNumber" TEXT,
  "documentDate" TIMESTAMP(3) NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "language" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
  "status" "ClinicalDocumentStatus" NOT NULL DEFAULT 'RECEIVED',
  "documentText" TEXT NOT NULL,
  "extractedData" JSONB NOT NULL,
  "provenance" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ClinicalDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ClinicalDocument_patientId_documentDate_idx"
  ON "ClinicalDocument"("patientId", "documentDate");
CREATE INDEX "ClinicalDocument_encounterId_documentDate_idx"
  ON "ClinicalDocument"("encounterId", "documentDate");
CREATE INDEX "ClinicalDocument_documentType_status_idx"
  ON "ClinicalDocument"("documentType", "status");

ALTER TABLE "ClinicalDocument"
  ADD CONSTRAINT "ClinicalDocument_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClinicalDocument"
  ADD CONSTRAINT "ClinicalDocument_encounterId_fkey"
  FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
