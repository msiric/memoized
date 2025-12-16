/*
  Warnings:

  - The values [ALGORITHM,THEORETICAL] on the enum `ProblemType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ProblemType_new" AS ENUM ('CODING', 'THEORY');
ALTER TABLE "Problem" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "Problem" ALTER COLUMN "type" TYPE "ProblemType_new" USING (
  CASE
    WHEN "type"::text = 'ALGORITHM' THEN 'CODING'
    WHEN "type"::text = 'THEORETICAL' THEN 'THEORY'
    ELSE 'CODING'
  END::"ProblemType_new"
);
ALTER TYPE "ProblemType" RENAME TO "ProblemType_old";
ALTER TYPE "ProblemType_new" RENAME TO "ProblemType";
DROP TYPE "ProblemType_old";
ALTER TABLE "Problem" ALTER COLUMN "type" SET DEFAULT 'CODING';
COMMIT;

-- AlterTable
ALTER TABLE "Problem" ALTER COLUMN "type" SET DEFAULT 'CODING';
