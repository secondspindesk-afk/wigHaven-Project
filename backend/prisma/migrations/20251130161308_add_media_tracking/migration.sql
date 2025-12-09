-- CreateTable
CREATE TABLE "media" (
    "id" VARCHAR(30) NOT NULL,
    "fileId" VARCHAR(100) NOT NULL,
    "fileName" VARCHAR(255) NOT NULL,
    "filePath" VARCHAR(500) NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "file_hash" VARCHAR(64),
    "type" VARCHAR(50) NOT NULL,
    "mime_type" VARCHAR(50) NOT NULL,
    "size" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "uploaded_by" VARCHAR(30) NOT NULL,
    "used_by" VARCHAR(30),
    "usage_type" VARCHAR(50),
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "trashed_at" TIMESTAMP(3),
    "trashed_by" VARCHAR(30),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "media_fileId_key" ON "media"("fileId");

-- CreateIndex
CREATE INDEX "media_fileId_idx" ON "media"("fileId");

-- CreateIndex
CREATE INDEX "media_file_hash_idx" ON "media"("file_hash");

-- CreateIndex
CREATE INDEX "media_type_idx" ON "media"("type");

-- CreateIndex
CREATE INDEX "media_status_idx" ON "media"("status");

-- CreateIndex
CREATE INDEX "media_uploaded_by_idx" ON "media"("uploaded_by");

-- CreateIndex
CREATE INDEX "media_used_by_usage_type_idx" ON "media"("used_by", "usage_type");

-- CreateIndex
CREATE INDEX "media_status_trashed_at_idx" ON "media"("status", "trashed_at");

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_trashed_by_fkey" FOREIGN KEY ("trashed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
