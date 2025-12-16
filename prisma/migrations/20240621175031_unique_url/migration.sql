/*
  Warnings:

  - A unique constraint covering the columns `[leetcodeUrl]` on the table `Question` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Question_leetcodeUrl_key" ON "Question"("leetcodeUrl");
