-- AlterTable
ALTER TABLE "IntakeReport" ADD COLUMN     "pdfData" BYTEA,
ADD COLUMN     "pdfFilename" TEXT,
ADD COLUMN     "pdfMimeType" TEXT;
