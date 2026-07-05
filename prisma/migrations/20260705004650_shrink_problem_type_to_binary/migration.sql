-- ProblemType is a binary taxonomy by design: THEORY (explain a concept) and
-- CODING (write an implementation). IMPLEMENT and CODE were added reactively to
-- unblock a content sync; after the 9 mislabeled frontend problems were
-- reclassified to THEORY, those two variants are unused. Remove them so the enum
-- reflects the design and the sync fails loudly if a mislabel is reintroduced.
--
-- Postgres cannot drop enum values in place, so the type is recreated. The cast
-- runs inside the transaction below: if any row still referenced IMPLEMENT/CODE
-- the whole migration rolls back rather than corrupt data.

-- AlterEnum
BEGIN;
CREATE TYPE "ProblemType_new" AS ENUM ('CODING', 'THEORY');
ALTER TABLE "Problem" ALTER COLUMN "type" TYPE "ProblemType_new" USING ("type"::text::"ProblemType_new");
ALTER TYPE "ProblemType" RENAME TO "ProblemType_old";
ALTER TYPE "ProblemType_new" RENAME TO "ProblemType";
DROP TYPE "ProblemType_old";
COMMIT;
