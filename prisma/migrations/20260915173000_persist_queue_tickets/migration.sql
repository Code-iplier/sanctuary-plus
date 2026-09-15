-- Persist queue tickets created by patients and staff so the live queue survives a backend restart.
CREATE TABLE "QueueTicket" (
    "id" TEXT NOT NULL,
    "encounterId" TEXT,
    "patientId" TEXT NOT NULL,
    "patientName" TEXT NOT NULL,
    "patientPhone" TEXT NOT NULL,
    "tokenNumber" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "departmentName" TEXT NOT NULL,
    "visitType" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "triageLevel" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "triageScore" INTEGER,
    "triageNotes" TEXT,
    "vitals" JSONB,
    "assignedDoctorId" TEXT,
    "assignedRoomId" TEXT,
    "assignedDoctorName" TEXT,
    "assignedRoomNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "triagedAt" TIMESTAMP(3),
    "calledAt" TIMESTAMP(3),
    "consultationStartedAt" TIMESTAMP(3),
    "consultationCompletedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QueueTicket_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "QueueTicket_encounterId_key" ON "QueueTicket"("encounterId");
CREATE INDEX "QueueTicket_patientId_status_idx" ON "QueueTicket"("patientId", "status");
CREATE INDEX "QueueTicket_encounterId_idx" ON "QueueTicket"("encounterId");
CREATE INDEX "QueueTicket_departmentId_status_idx" ON "QueueTicket"("departmentId", "status");
