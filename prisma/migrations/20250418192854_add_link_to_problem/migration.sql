/*
  Warnings:

  - Added the required column `link` to the `Problem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable - Add link with default empty string for existing rows
ALTER TABLE "Problem" ADD COLUMN "link" TEXT NOT NULL DEFAULT '';

-- Remove default for future inserts
ALTER TABLE "Problem" ALTER COLUMN "link" DROP DEFAULT;
