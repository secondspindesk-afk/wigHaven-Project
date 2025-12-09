-- AlterTable
ALTER TABLE "email_logs" ADD COLUMN     "body" TEXT,
ADD COLUMN     "template_data" JSONB;

-- CreateTable
CREATE TABLE "email_preferences" (
    "id" VARCHAR(30) NOT NULL,
    "user_id" VARCHAR(30),
    "email" VARCHAR(255) NOT NULL,
    "unsubscribed_from_all" BOOLEAN NOT NULL DEFAULT false,
    "marketing_emails" BOOLEAN NOT NULL DEFAULT true,
    "abandoned_cart_emails" BOOLEAN NOT NULL DEFAULT true,
    "back_in_stock_emails" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_preferences_user_id_key" ON "email_preferences"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "email_preferences_email_key" ON "email_preferences"("email");

-- CreateIndex
CREATE INDEX "email_preferences_email_idx" ON "email_preferences"("email");

-- CreateIndex
CREATE INDEX "email_logs_type_idx" ON "email_logs"("type");

-- CreateIndex
CREATE INDEX "email_logs_status_idx" ON "email_logs"("status");

-- CreateIndex
CREATE INDEX "email_logs_created_at_idx" ON "email_logs"("created_at");

-- AddForeignKey
ALTER TABLE "email_preferences" ADD CONSTRAINT "email_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
