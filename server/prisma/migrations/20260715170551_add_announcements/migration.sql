/*
  Warnings:

  - A unique constraint covering the columns `[school_id,email]` on the table `parents` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `password_hash` to the `parents` table without a default value. This is not possible if the table is not empty.
  - Made the column `email` on table `parents` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "parents" ADD COLUMN     "email_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "last_login_at" TIMESTAMP(3),
ADD COLUMN     "password_hash" TEXT NOT NULL,
ALTER COLUMN "phone" DROP NOT NULL,
ALTER COLUMN "email" SET NOT NULL;

-- AlterTable
ALTER TABLE "school_subscriptions" ALTER COLUMN "prorated_credit" DROP NOT NULL;

-- CreateTable
CREATE TABLE "announcements" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "announcements_school_id_idx" ON "announcements"("school_id");

-- CreateIndex
CREATE INDEX "announcements_date_idx" ON "announcements"("date");

-- CreateIndex
CREATE INDEX "assessments_school_id_term_id_idx" ON "assessments"("school_id", "term_id");

-- CreateIndex
CREATE INDEX "assessments_school_id_subject_id_term_id_idx" ON "assessments"("school_id", "subject_id", "term_id");

-- CreateIndex
CREATE INDEX "document_verifications_hash_idx" ON "document_verifications"("hash");

-- CreateIndex
CREATE INDEX "enrollments_class_id_term_id_idx" ON "enrollments"("class_id", "term_id");

-- CreateIndex
CREATE UNIQUE INDEX "parents_school_id_email_key" ON "parents"("school_id", "email");

-- CreateIndex
CREATE INDEX "results_school_id_term_id_idx" ON "results"("school_id", "term_id");

-- CreateIndex
CREATE INDEX "results_school_id_subject_id_idx" ON "results"("school_id", "subject_id");

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
