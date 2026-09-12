-- CreateEnum
CREATE TYPE "MedicationSource" AS ENUM ('HOME', 'HOSPITAL', 'EXTERNAL', 'DISCHARGE');

-- CreateEnum
CREATE TYPE "MedicationStatus" AS ENUM ('ACTIVE', 'REVIEW', 'HELD', 'DISCONTINUED', 'FLAGGED');

-- CreateEnum
CREATE TYPE "MedicationRisk" AS ENUM ('LOW', 'MODERATE', 'HIGH');

-- CreateEnum
CREATE TYPE "AllergyStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'UNVERIFIED');

-- CreateEnum
CREATE TYPE "ReconciliationDecision" AS ENUM ('CONTINUE', 'MODIFY', 'HOLD', 'DISCONTINUE', 'REPLACE', 'REVIEW');

-- CreateEnum
CREATE TYPE "SafetySeverity" AS ENUM ('LOW', 'MODERATE', 'HIGH', 'CRITICAL');

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL,
    "externalId" TEXT,
    "displayName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Encounter" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Encounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicationConcept" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "genericName" TEXT NOT NULL,
    "rxCui" TEXT,
    "ingredients" TEXT[],
    "therapeuticClass" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'internal-rules',
    "sourceVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicationConcept_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Medication" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "encounterId" TEXT,
    "conceptId" TEXT,
    "name" TEXT NOT NULL,
    "dose" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "strength" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "scheduled" TEXT NOT NULL,
    "source" "MedicationSource" NOT NULL,
    "status" "MedicationStatus" NOT NULL DEFAULT 'REVIEW',
    "risk" "MedicationRisk" NOT NULL DEFAULT 'MODERATE',
    "prescriberId" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Medication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Allergy" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "substance" TEXT NOT NULL,
    "normalizedSubstance" TEXT NOT NULL,
    "reaction" TEXT NOT NULL,
    "severity" "SafetySeverity",
    "status" "AllergyStatus" NOT NULL DEFAULT 'ACTIVE',
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Allergy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReconciliationRecord" (
    "id" TEXT NOT NULL,
    "medicationId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "previousStatus" "MedicationStatus" NOT NULL,
    "decision" "ReconciliationDecision" NOT NULL,
    "previousValue" JSONB,
    "newValue" JSONB,
    "reason" TEXT NOT NULL,
    "changedBy" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReconciliationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicationInteraction" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "medicationId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "severity" "SafetySeverity" NOT NULL,
    "medicationNames" TEXT[],
    "description" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "ruleVersion" TEXT NOT NULL,
    "evaluatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicationInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "beforeJson" JSONB,
    "afterJson" JSONB,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Patient_externalId_key" ON "Patient"("externalId");

-- CreateIndex
CREATE INDEX "Encounter_patientId_status_idx" ON "Encounter"("patientId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "MedicationConcept_rxCui_key" ON "MedicationConcept"("rxCui");

-- CreateIndex
CREATE INDEX "Medication_patientId_status_idx" ON "Medication"("patientId", "status");

-- CreateIndex
CREATE INDEX "Medication_conceptId_idx" ON "Medication"("conceptId");

-- CreateIndex
CREATE INDEX "Allergy_patientId_status_idx" ON "Allergy"("patientId", "status");

-- CreateIndex
CREATE INDEX "ReconciliationRecord_patientId_changedAt_idx" ON "ReconciliationRecord"("patientId", "changedAt");

-- CreateIndex
CREATE INDEX "ReconciliationRecord_medicationId_changedAt_idx" ON "ReconciliationRecord"("medicationId", "changedAt");

-- CreateIndex
CREATE INDEX "MedicationInteraction_patientId_evaluatedAt_idx" ON "MedicationInteraction"("patientId", "evaluatedAt");

-- CreateIndex
CREATE INDEX "AuditEvent_patientId_createdAt_idx" ON "AuditEvent"("patientId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_entityType_entityId_idx" ON "AuditEvent"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Medication" ADD CONSTRAINT "Medication_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Medication" ADD CONSTRAINT "Medication_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Medication" ADD CONSTRAINT "Medication_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "MedicationConcept"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Allergy" ADD CONSTRAINT "Allergy_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationRecord" ADD CONSTRAINT "ReconciliationRecord_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "Medication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationRecord" ADD CONSTRAINT "ReconciliationRecord_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationInteraction" ADD CONSTRAINT "MedicationInteraction_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationInteraction" ADD CONSTRAINT "MedicationInteraction_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "Medication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
