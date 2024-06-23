/*
  Warnings:

  - You are about to drop the column `leetcodeUrl` on the `Problem` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[href]` on the table `Problem` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `href` to the `Problem` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Problem_leetcodeUrl_key";

-- AlterTable
ALTER TABLE "Problem" DROP COLUMN "leetcodeUrl",
ADD COLUMN     "href" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Problem_href_key" ON "Problem"("href");
