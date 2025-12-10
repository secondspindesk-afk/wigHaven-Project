-- AlterTable
ALTER TABLE "support_messages" ALTER COLUMN "sender_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "support_tickets" ADD COLUMN     "guest_email" VARCHAR(255),
ADD COLUMN     "guest_name" VARCHAR(100),
ALTER COLUMN "user_id" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "support_tickets_guest_email_idx" ON "support_tickets"("guest_email");
