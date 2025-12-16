-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "body" TEXT,
ADD COLUMN     "serializedBody" JSONB;

-- CreateIndex
CREATE INDEX "course_slug_idx" ON "Course"("slug");
