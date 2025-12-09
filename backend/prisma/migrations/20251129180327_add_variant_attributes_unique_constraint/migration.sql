/*
  Warnings:

  - A unique constraint covering the columns `[product_id,color,length,texture,size]` on the table `variants` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "variants_product_id_color_length_texture_size_key" ON "variants"("product_id", "color", "length", "texture", "size");
