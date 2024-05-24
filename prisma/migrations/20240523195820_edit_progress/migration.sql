/*
  Warnings:

  - You are about to drop the column `lastAccessed` on the `UserProgress` table. All the data in the column will be lost.
  - You are about to drop the column `progress` on the `UserProgress` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "UserProgress" DROP COLUMN "lastAccessed",
DROP COLUMN "progress",
ADD COLUMN     "completed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
