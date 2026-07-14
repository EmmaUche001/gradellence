-- Add missing columns that exist in schema.prisma but were absent from the
-- initial foundation migration (migration drift fix).

-- AlterTable "schools": add signature_url (mapped from schema `signatureUrl`)
ALTER TABLE "schools" ADD COLUMN "signature_url" TEXT;