/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `Section` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slug` to the `Section` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Section" ADD COLUMN     "slug" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Section_slug_key" ON "Section"("slug");
