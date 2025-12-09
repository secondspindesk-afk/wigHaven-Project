-- CreateTable
CREATE TABLE "promotional_banners" (
    "id" VARCHAR(30) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "image_url" VARCHAR(500) NOT NULL,
    "link_url" VARCHAR(500),
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "created_by" VARCHAR(30) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promotional_banners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_milestones" (
    "id" VARCHAR(30) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "threshold" DECIMAL(15,2) NOT NULL,
    "current_value" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "is_reached" BOOLEAN NOT NULL DEFAULT false,
    "reached_at" TIMESTAMP(3),
    "notified_admins" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "currency_rates" (
    "id" VARCHAR(30) NOT NULL,
    "base_currency" VARCHAR(3) NOT NULL DEFAULT 'GHS',
    "currency" VARCHAR(3) NOT NULL,
    "rate" DECIMAL(10,6) NOT NULL,
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "currency_rates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "promotional_banners_is_active_priority_idx" ON "promotional_banners"("is_active", "priority");

-- CreateIndex
CREATE INDEX "promotional_banners_start_date_end_date_idx" ON "promotional_banners"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "admin_milestones_is_reached_idx" ON "admin_milestones"("is_reached");

-- CreateIndex
CREATE UNIQUE INDEX "admin_milestones_type_threshold_key" ON "admin_milestones"("type", "threshold");

-- CreateIndex
CREATE INDEX "currency_rates_currency_idx" ON "currency_rates"("currency");

-- CreateIndex
CREATE INDEX "currency_rates_last_updated_idx" ON "currency_rates"("last_updated");

-- CreateIndex
CREATE UNIQUE INDEX "currency_rates_base_currency_currency_key" ON "currency_rates"("base_currency", "currency");

-- AddForeignKey
ALTER TABLE "promotional_banners" ADD CONSTRAINT "promotional_banners_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
