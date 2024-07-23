/*
  Warnings:

  - A unique constraint covering the columns `[title]` on the table `Banner` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Banner_title_key" ON "Banner"("title");
