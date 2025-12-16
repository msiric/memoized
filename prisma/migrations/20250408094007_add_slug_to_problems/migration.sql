/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `Problem` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slug` to the `Problem` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Problem_href_key";

-- AlterTable - Add slug as nullable first
ALTER TABLE "Problem" ADD COLUMN "slug" TEXT;

-- Populate slug from href (extract the last segment of the URL)
UPDATE "Problem" SET "slug" = SUBSTRING("href" FROM '/problems/(.+)$');

-- Make slug NOT NULL
ALTER TABLE "Problem" ALTER COLUMN "slug" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Problem_slug_key" ON "Problem"("slug");
