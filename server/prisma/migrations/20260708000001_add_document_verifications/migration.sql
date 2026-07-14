-- Add the DocumentVerification model that exists in schema.prisma
-- but was missing from the initial foundation migration (migration drift fix).

-- CreateTable
CREATE TABLE "document_verifications" (
    "id" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "student_id" TEXT,
    "student_name" TEXT,
    "term_id" TEXT,
    "verified_at" TIMESTAMP(3),
    "verified_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "document_verifications_hash_key" ON "document_verifications"("hash");

-- CreateIndex
CREATE INDEX "document_verifications_school_id_idx" ON "document_verifications"("school_id");

-- AddForeignKey
ALTER TABLE "document_verifications" ADD CONSTRAINT "document_verifications_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;