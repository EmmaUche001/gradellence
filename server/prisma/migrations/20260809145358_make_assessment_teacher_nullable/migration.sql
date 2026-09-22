-- DropForeignKey
ALTER TABLE "assessments" DROP CONSTRAINT "assessments_teacher_id_fkey";

-- AlterTable
ALTER TABLE "assessments" ALTER COLUMN "teacher_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
