-- CreateEnum
CREATE TYPE "KioskSessionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'ABANDONED', 'ERROR');

-- CreateEnum
CREATE TYPE "ClinicalInterviewStage" AS ENUM ('CHIEF_COMPLAINT', 'CURRENT_PROBLEM', 'MEDICAL_HISTORY', 'MEDICATIONS_ALLERGIES', 'FAMILY_LIFESTYLE', 'VERIFICATION', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ClinicalFactProvenance" AS ENUM ('PATIENT_REPORTED', 'AI_DERIVED', 'DOCUMENT_EXTRACTED', 'CLINICIAN_CONFIRMED');

-- CreateEnum
CREATE TYPE "IntakeReportStatus" AS ENUM ('DRAFT', 'READY_FOR_REVIEW', 'PATIENT_VERIFIED', 'CLINICIAN_CONFIRMED');

-- CreateEnum
CREATE TYPE "TranscriptSpeaker" AS ENUM ('PATIENT', 'ASSISTANT', 'DOCTOR');

-- CreateEnum
CREATE TYPE "ConsultationStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "NextStepType" AS ENUM ('LAB_TEST', 'IMAGING', 'REFERRAL', 'PHARMACY', 'FOLLOW_UP', 'OTHER');

-- CreateEnum
CREATE TYPE "NextStepStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "KioskSession" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "status" "KioskSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentStage" "ClinicalInterviewStage" NOT NULL DEFAULT 'CHIEF_COMPLAINT',
    "clinicalState" JSONB NOT NULL DEFAULT '{}',
    "safetySignals" JSONB NOT NULL DEFAULT '[]',
    "patientVerified" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KioskSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TranscriptEntry" (
    "id" TEXT NOT NULL,
    "kioskSessionId" TEXT NOT NULL,
    "speaker" "TranscriptSpeaker" NOT NULL,
    "text" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TranscriptEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicalFact" (
    "id" TEXT NOT NULL,
    "kioskSessionId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "provenance" "ClinicalFactProvenance" NOT NULL,
    "transcriptEntryId" TEXT,
    "clinicianConfirmedAt" TIMESTAMP(3),
    "clinicianConfirmedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicalFact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntakeReport" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "kioskSessionId" TEXT NOT NULL,
    "status" "IntakeReportStatus" NOT NULL DEFAULT 'DRAFT',
    "report" JSONB NOT NULL,
    "patientVerifiedAt" TIMESTAMP(3),
    "clinicianConfirmedAt" TIMESTAMP(3),
    "clinicianConfirmedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntakeReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consultation" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "status" "ConsultationStatus" NOT NULL DEFAULT 'DRAFT',
    "transcript" JSONB NOT NULL DEFAULT '[]',
    "decisions" JSONB NOT NULL DEFAULT '{}',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Consultation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientNextStep" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "type" "NextStepType" NOT NULL,
    "title" TEXT NOT NULL,
    "destinationName" TEXT,
    "destinationDepartment" TEXT,
    "destinationFloor" TEXT,
    "destinationRoom" TEXT,
    "instructions" TEXT,
    "preparation" TEXT,
    "fastingRequired" BOOLEAN,
    "fastingInstructions" TEXT,
    "timing" TEXT,
    "dependencies" TEXT[],
    "status" "NextStepStatus" NOT NULL DEFAULT 'PENDING',
    "source" TEXT NOT NULL DEFAULT 'CLINICIAN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientNextStep_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KioskSession_patientId_status_idx" ON "KioskSession"("patientId", "status");

-- CreateIndex
CREATE INDEX "KioskSession_encounterId_status_idx" ON "KioskSession"("encounterId", "status");

-- CreateIndex
CREATE INDEX "TranscriptEntry_kioskSessionId_occurredAt_idx" ON "TranscriptEntry"("kioskSessionId", "occurredAt");

-- CreateIndex
CREATE INDEX "ClinicalFact_kioskSessionId_key_idx" ON "ClinicalFact"("kioskSessionId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "IntakeReport_kioskSessionId_key" ON "IntakeReport"("kioskSessionId");

-- CreateIndex
CREATE INDEX "IntakeReport_patientId_status_idx" ON "IntakeReport"("patientId", "status");

-- CreateIndex
CREATE INDEX "IntakeReport_encounterId_status_idx" ON "IntakeReport"("encounterId", "status");

-- CreateIndex
CREATE INDEX "Consultation_patientId_status_idx" ON "Consultation"("patientId", "status");

-- CreateIndex
CREATE INDEX "Consultation_encounterId_status_idx" ON "Consultation"("encounterId", "status");

-- CreateIndex
CREATE INDEX "PatientNextStep_patientId_status_idx" ON "PatientNextStep"("patientId", "status");

-- CreateIndex
CREATE INDEX "PatientNextStep_encounterId_status_idx" ON "PatientNextStep"("encounterId", "status");

-- AddForeignKey
ALTER TABLE "KioskSession" ADD CONSTRAINT "KioskSession_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KioskSession" ADD CONSTRAINT "KioskSession_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranscriptEntry" ADD CONSTRAINT "TranscriptEntry_kioskSessionId_fkey" FOREIGN KEY ("kioskSessionId") REFERENCES "KioskSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalFact" ADD CONSTRAINT "ClinicalFact_kioskSessionId_fkey" FOREIGN KEY ("kioskSessionId") REFERENCES "KioskSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntakeReport" ADD CONSTRAINT "IntakeReport_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntakeReport" ADD CONSTRAINT "IntakeReport_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntakeReport" ADD CONSTRAINT "IntakeReport_kioskSessionId_fkey" FOREIGN KEY ("kioskSessionId") REFERENCES "KioskSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientNextStep" ADD CONSTRAINT "PatientNextStep_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientNextStep" ADD CONSTRAINT "PatientNextStep_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
