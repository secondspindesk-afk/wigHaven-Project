-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "coupon_code" VARCHAR(50);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "locked_until" TIMESTAMP(3),
ADD COLUMN     "review_status" VARCHAR(20) NOT NULL DEFAULT 'standard';

-- CreateTable
CREATE TABLE "review_votes" (
    "id" VARCHAR(30) NOT NULL,
    "review_id" VARCHAR(30) NOT NULL,
    "user_id" VARCHAR(30) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_votes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "review_votes_review_id_idx" ON "review_votes"("review_id");

-- CreateIndex
CREATE INDEX "review_votes_user_id_idx" ON "review_votes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "review_votes_review_id_user_id_key" ON "review_votes"("review_id", "user_id");

-- AddForeignKey
ALTER TABLE "review_votes" ADD CONSTRAINT "review_votes_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_votes" ADD CONSTRAINT "review_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
