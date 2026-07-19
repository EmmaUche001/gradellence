-- AlterTable
ALTER TABLE "grade_scales" ADD COLUMN     "is_pass" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "results" ADD COLUMN     "is_pass" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "points" DOUBLE PRECISION;
