-- Lesson and Problem slugs are derived from titles (slugify) and were globally
-- unique, which collided when two entities shared a title (e.g. two "Security"
-- lessons in different sections) — the sync overwrote one, losing content.
-- Identity is already the stable, title-independent contentId, and URLs are
-- hierarchical (/course/section/lesson, problems are #slug anchors within a
-- lesson), so slugs only need to be unique within their parent. Scope them.

-- Drop the global unique on slug. Depending on how the environment was first
-- provisioned it exists either as a named constraint (constraint-backed index)
-- or as a bare unique index, so handle both — dropping the constraint also
-- drops its backing index; the DROP INDEX cleans up the bare-index case.
ALTER TABLE "Lesson" DROP CONSTRAINT IF EXISTS "Lesson_slug_key";
DROP INDEX IF EXISTS "Lesson_slug_key";

ALTER TABLE "Problem" DROP CONSTRAINT IF EXISTS "Problem_slug_key";
DROP INDEX IF EXISTS "Problem_slug_key";

-- CreateIndex
CREATE UNIQUE INDEX "Lesson_sectionId_slug_key" ON "Lesson"("sectionId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Problem_lessonId_slug_key" ON "Problem"("lessonId", "slug");
