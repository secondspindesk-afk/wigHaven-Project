/*
  Warnings:

  - A unique constraint covering the columns `[ticket_number]` on the table `support_tickets` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "support_tickets" ADD COLUMN     "ticket_number" SERIAL NOT NULL;

-- CreateIndex
CREATE INDEX "orders_coupon_code_idx" ON "orders"("coupon_code");

-- CreateIndex
CREATE INDEX "orders_user_id_payment_status_idx" ON "orders"("user_id", "payment_status");

-- CreateIndex
CREATE UNIQUE INDEX "support_tickets_ticket_number_key" ON "support_tickets"("ticket_number");
