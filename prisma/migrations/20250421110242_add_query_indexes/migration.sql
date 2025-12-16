-- DropForeignKey
ALTER TABLE "Account" DROP CONSTRAINT "Account_userId_fkey";

-- DropForeignKey
ALTER TABLE "Customer" DROP CONSTRAINT "Customer_userId_fkey";

-- DropForeignKey
ALTER TABLE "Lesson" DROP CONSTRAINT "Lesson_sectionId_fkey";

-- DropForeignKey
ALTER TABLE "Problem" DROP CONSTRAINT "Problem_lessonId_fkey";

-- DropForeignKey
ALTER TABLE "Section" DROP CONSTRAINT "Section_courseId_fkey";

-- DropForeignKey
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_customerId_fkey";

-- DropForeignKey
ALTER TABLE "UserLessonProgress" DROP CONSTRAINT "UserLessonProgress_lessonId_fkey";

-- DropForeignKey
ALTER TABLE "UserLessonProgress" DROP CONSTRAINT "UserLessonProgress_userId_fkey";

-- DropForeignKey
ALTER TABLE "UserProblemProgress" DROP CONSTRAINT "UserProblemProgress_problemId_fkey";

-- DropForeignKey
ALTER TABLE "UserProblemProgress" DROP CONSTRAINT "UserProblemProgress_userId_fkey";

-- CreateIndex
CREATE INDEX "account_user_id_idx" ON "Account"("userId");

-- CreateIndex
CREATE INDEX "banner_is_active_start_date_end_date_idx" ON "Banner"("isActive", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "banner_priority_idx" ON "Banner"("priority");

-- CreateIndex
CREATE INDEX "course_order_idx" ON "Course"("order");

-- CreateIndex
CREATE INDEX "course_is_active_idx" ON "Course"("isActive");

-- CreateIndex
CREATE INDEX "lesson_order_idx" ON "Lesson"("order");

-- CreateIndex
CREATE INDEX "lesson_access_idx" ON "Lesson"("access");

-- CreateIndex
CREATE INDEX "lesson_section_order_idx" ON "Lesson"("sectionId", "order");

-- CreateIndex
CREATE INDEX "problem_type_idx" ON "Problem"("type");

-- CreateIndex
CREATE INDEX "problem_difficulty_idx" ON "Problem"("difficulty");

-- CreateIndex
CREATE INDEX "problem_lesson_difficulty_idx" ON "Problem"("lessonId", "difficulty");

-- CreateIndex
CREATE INDEX "resource_order_idx" ON "Resource"("order");

-- CreateIndex
CREATE INDEX "resource_access_idx" ON "Resource"("access");

-- CreateIndex
CREATE INDEX "resource_lesson_order_idx" ON "Resource"("lessonId", "order");

-- CreateIndex
CREATE INDEX "section_order_idx" ON "Section"("order");

-- CreateIndex
CREATE INDEX "section_course_order_idx" ON "Section"("courseId", "order");

-- CreateIndex
CREATE INDEX "subscription_status_idx" ON "Subscription"("status");

-- CreateIndex
CREATE INDEX "subscription_plan_idx" ON "Subscription"("plan");

-- CreateIndex
CREATE INDEX "subscription_end_date_idx" ON "Subscription"("endDate");

-- CreateIndex
CREATE INDEX "subscription_customer_status_idx" ON "Subscription"("customerId", "status");

-- CreateIndex
CREATE INDEX "user_created_at_idx" ON "User"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "user_lesson_user_completed_idx" ON "UserLessonProgress"("userId", "completed");

-- CreateIndex
CREATE INDEX "user_problem_completed_idx" ON "UserProblemProgress"("completed");

-- CreateIndex
CREATE INDEX "user_problem_completed_at_idx" ON "UserProblemProgress"("completedAt");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLessonProgress" ADD CONSTRAINT "UserLessonProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLessonProgress" ADD CONSTRAINT "UserLessonProgress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Problem" ADD CONSTRAINT "Problem_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProblemProgress" ADD CONSTRAINT "UserProblemProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProblemProgress" ADD CONSTRAINT "UserProblemProgress_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
