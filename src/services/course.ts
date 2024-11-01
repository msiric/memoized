import prisma from '@/lib/prisma'
import {
  buildCurriculum,
  calculateProgress,
  sortCurriculum,
} from '@/utils/helpers'
import { getUserWithSubscriptionDetails } from './user'

export const getActiveCoursesWithProgress = async (userId?: string) => {
  const userPromise = userId
    ? getUserWithSubscriptionDetails(userId)
    : Promise.resolve(null)

  const lessonsPromise = prisma.lesson.findMany({
    include: {
      section: {
        include: {
          course: true,
        },
      },
      problems: true,
      resources: true,
      lessonProgress: userId ? { where: { userId, completed: true } } : false,
    },
    where: {
      section: {
        course: {
          isActive: true,
        },
      },
    },
  })

  const [user, lessons] = await Promise.all([userPromise, lessonsPromise])

  // Use buildCurriculum to structure the courses
  const curriculum = buildCurriculum(lessons)

  // Sort curriculum by order
  const sortedCurriculum = sortCurriculum(curriculum)

  // Map each course with its progress data if user exists
  const coursesWithProgress = sortedCurriculum?.map((course) => {
    const courseLessons = course.sections.flatMap((section) => section.lessons)
    const courseProblems = courseLessons.flatMap((lesson) => lesson.problems)

    const progress = user
      ? calculateProgress(user, courseLessons.length, courseProblems.length)
      : null

    return {
      ...course,
      progress,
    }
  })

  return coursesWithProgress
}

export const getCourseBySlug = async (courseSlug: string) => {
  const course = await prisma.course.findUnique({
    where: { slug: courseSlug, isActive: true },
    select: { id: true },
  })

  if (!course) {
    return null
  }

  return course
}
