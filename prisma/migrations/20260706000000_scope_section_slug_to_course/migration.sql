-- Section slugs are derived from titles (slugify) and were globally unique,
-- which collides when two courses legitimately share a section title. Identity
-- is already the stable, title-independent contentId (courseId + sectionId) and
-- URLs are hierarchical (/courses/<course>/<section>), so a section slug only
-- needs to be unique within its course. Scope it — mirroring the earlier
-- lesson/problem scoping so no hierarchical entity keys on a global slug.

-- Drop the global unique on slug. Depending on how the environment was first
-- provisioned it exists either as a named constraint (constraint-backed index)
-- or as a bare unique index, so handle both — dropping the constraint also
-- drops its backing index; the DROP INDEX cleans up the bare-index case.
ALTER TABLE "Section" DROP CONSTRAINT IF EXISTS "Section_slug_key";
DROP INDEX IF EXISTS "Section_slug_key";

-- CreateIndex
CREATE UNIQUE INDEX "Section_courseId_slug_key" ON "Section"("courseId", "slug");
