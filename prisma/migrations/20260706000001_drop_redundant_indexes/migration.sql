-- Schema hygiene: drop two redundant indexes.
--
-- 1. "course_slug_idx" duplicates the unique index Postgres already maintains
--    for Course.slug @unique ("Course_slug_key") — two btrees on the same column.
-- 2. "section_course_idx" on (courseId) is covered by the leftmost-prefix of both
--    "section_course_order_idx" (courseId, order) and the new
--    "Section_courseId_slug_key" (courseId, slug), so a standalone (courseId)
--    index is redundant for lookups and FK maintenance.
--
-- Both are pure write-amplification/storage with no read benefit. Guarded with
-- IF EXISTS so this is a no-op on any DB that never had them.
DROP INDEX IF EXISTS "course_slug_idx";
DROP INDEX IF EXISTS "section_course_idx";
