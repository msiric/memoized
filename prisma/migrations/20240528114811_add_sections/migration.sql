/*
  Warnings:

  - You are about to drop the column `stripeId` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the column `contentId` on the `UserProgress` table. All the data in the column will be lost.
  - You are about to drop the `Content` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[stripeSubscriptionId]` on the table `Subscription` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,lessonId]` on the table `UserProgress` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `stripeSubscriptionId` to the `Subscription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lessonId` to the `UserProgress` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Content" DROP CONSTRAINT "Content_courseId_fkey";

-- DropForeignKey
ALTER TABLE "UserProgress" DROP CONSTRAINT "UserProgress_contentId_fkey";

-- DropIndex
DROP INDEX "Subscription_stripeId_key";

-- DropIndex
DROP INDEX "UserProgress_userId_contentId_key";

-- AlterTable
ALTER TABLE "Subscription" DROP COLUMN "stripeId",
ADD COLUMN     "stripeSubscriptionId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "stripeAccountId" TEXT;

-- AlterTable
ALTER TABLE "UserProgress" DROP COLUMN "contentId",
ADD COLUMN     "lessonId" INTEGER NOT NULL;

-- DropTable
DROP TABLE "Content";

-- CreateTable
CREATE TABLE "Lesson" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "slug" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "access" "AccessOptions" NOT NULL DEFAULT 'FREE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sectionId" INTEGER NOT NULL,

    CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Section" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "courseId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lesson_slug_key" ON "Lesson"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "UserProgress_userId_lessonId_key" ON "UserProgress"("userId", "lessonId");

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProgress" ADD CONSTRAINT "UserProgress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
