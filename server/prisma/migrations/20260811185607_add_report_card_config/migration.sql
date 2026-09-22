-- CreateTable
CREATE TABLE "report_card_configs" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "template" TEXT NOT NULL DEFAULT 'classic',
    "accent_color" TEXT NOT NULL DEFAULT '#1a56db',
    "motto" TEXT,
    "principal_name" TEXT,
    "principal_signature" TEXT,
    "school_stamp" TEXT,
    "show_ranking" BOOLEAN NOT NULL DEFAULT true,
    "show_cumulative" BOOLEAN NOT NULL DEFAULT true,
    "show_affective" BOOLEAN NOT NULL DEFAULT false,
    "show_psychomotor" BOOLEAN NOT NULL DEFAULT false,
    "show_teacher_remark" BOOLEAN NOT NULL DEFAULT true,
    "show_principal_remark" BOOLEAN NOT NULL DEFAULT true,
    "show_resumption_date" BOOLEAN NOT NULL DEFAULT true,
    "show_stamp" BOOLEAN NOT NULL DEFAULT true,
    "show_powered_by" BOOLEAN NOT NULL DEFAULT true,
    "affective_traits" JSONB,
    "psychomotor_traits" JSONB,
    "footer_text" TEXT,
    "next_term_date" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_card_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "report_card_configs_school_id_key" ON "report_card_configs"("school_id");

-- AddForeignKey
ALTER TABLE "report_card_configs" ADD CONSTRAINT "report_card_configs_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
