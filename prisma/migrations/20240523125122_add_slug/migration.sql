/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `Content` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slug` to the `Content` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Content" ADD COLUMN     "slug" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Content_slug_key" ON "Content"("slug");
