-- CreateIndex
CREATE INDEX "section_slug_idx" ON "Section"("slug");

-- CreateIndex
CREATE INDEX "section_course_idx" ON "Section"("courseId");
