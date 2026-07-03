-- Stable, title-independent identity for content entities so the content sync
-- can key on it instead of slugify(title). Nullable + unique: existing rows are
-- backfilled by scripts/backfill-content-id.ts before the sync switches over.

-- AlterTable
ALTER TABLE "Course" ADD COLUMN "contentId" TEXT;
ALTER TABLE "Section" ADD COLUMN "contentId" TEXT;
ALTER TABLE "Lesson" ADD COLUMN "contentId" TEXT;
ALTER TABLE "Problem" ADD COLUMN "contentId" TEXT;
ALTER TABLE "Resource" ADD COLUMN "contentId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Course_contentId_key" ON "Course"("contentId");
CREATE UNIQUE INDEX "Section_contentId_key" ON "Section"("contentId");
CREATE UNIQUE INDEX "Lesson_contentId_key" ON "Lesson"("contentId");
CREATE UNIQUE INDEX "Problem_contentId_key" ON "Problem"("contentId");
CREATE UNIQUE INDEX "Resource_contentId_key" ON "Resource"("contentId");
