-- CreateTable
CREATE TABLE "system_settings" (
    "id" VARCHAR(30) NOT NULL,
    "key" VARCHAR(50) NOT NULL,
    "value" TEXT NOT NULL,
    "description" VARCHAR(255),
    "updated_by" VARCHAR(30),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocked_ips" (
    "id" VARCHAR(30) NOT NULL,
    "ip" VARCHAR(45) NOT NULL,
    "reason" VARCHAR(255),
    "blocked_by" VARCHAR(30),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocked_ips_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");

-- CreateIndex
CREATE UNIQUE INDEX "blocked_ips_ip_key" ON "blocked_ips"("ip");
