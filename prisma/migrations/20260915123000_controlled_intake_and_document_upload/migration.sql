ALTER TABLE "KioskSession" ADD COLUMN "followUpCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ClinicalDocument" ADD COLUMN "originalFilename" TEXT;
ALTER TABLE "ClinicalDocument" ADD COLUMN "binaryData" BYTEA;
