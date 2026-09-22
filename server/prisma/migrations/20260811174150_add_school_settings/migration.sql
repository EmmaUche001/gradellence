-- CreateTable
CREATE TABLE "school_settings" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "grading_system" TEXT NOT NULL DEFAULT 'PERCENTAGE',
    "pass_mark" INTEGER NOT NULL DEFAULT 40,
    "ca_weight" INTEGER NOT NULL DEFAULT 30,
    "exam_weight" INTEGER NOT NULL DEFAULT 70,
    "max_score" INTEGER NOT NULL DEFAULT 100,
    "show_position" BOOLEAN NOT NULL DEFAULT true,
    "show_grade" BOOLEAN NOT NULL DEFAULT true,
    "show_remark" BOOLEAN NOT NULL DEFAULT true,
    "result_template" TEXT NOT NULL DEFAULT 'STANDARD',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "school_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "school_settings_school_id_key" ON "school_settings"("school_id");

-- AddForeignKey
ALTER TABLE "school_settings" ADD CONSTRAINT "school_settings_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
