-- CreateEnum
CREATE TYPE "ProblemType" AS ENUM ('ALGORITHM', 'THEORETICAL');

-- AlterTable
ALTER TABLE "Problem" ADD COLUMN     "answer" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "question" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "type" "ProblemType" NOT NULL DEFAULT 'ALGORITHM';
