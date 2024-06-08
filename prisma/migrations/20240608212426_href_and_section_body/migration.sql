/*
  Warnings:

  - Added the required column `href` to the `Course` table without a default value. This is not possible if the table is not empty.
  - Added the required column `href` to the `Lesson` table without a default value. This is not possible if the table is not empty.
  - Added the required column `body` to the `Section` table without a default value. This is not possible if the table is not empty.
  - Added the required column `href` to the `Section` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "href" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN     "href" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Section" ADD COLUMN     "body" TEXT NOT NULL,
ADD COLUMN     "href" TEXT NOT NULL;
