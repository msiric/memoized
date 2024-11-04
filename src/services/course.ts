import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '../app/api/auth/[...nextauth]/route'
import { getUserWithSubscriptionDetails } from './user'

export const getActiveCoursesWithProgress = async () => {
  const session = await getServerSession(authOptions)

  const userId = session?.userId

  const [user, activeCourses] = await Promise.all([
    userId ? getUserWithSubscriptionDetails(userId) : Promise.resolve(null),
    prisma.course.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        title: true,
        description: true,
        href: true,
        slug: true,
        order: true,
        sections: {
          select: {
            id: true,
            title: true,
            description: true,
            slug: true,
            order: true,
            href: true,
            lessons: {
              select: {
                id: true,
                title: true,
                description: true,
                slug: true,
                order: true,
                href: true,
                access: true,
                problems: {
                  select: {
                    id: true,
                    title: true,
                    difficulty: true,
                    problemProgress: userId
                      ? {
                          where: {
                            userId: userId,
                            completed: true,
                          },
                          select: {
                            completed: true,
                          },
                        }
                      : false,
                  },
                },
                lessonProgress: userId
                  ? {
                      where: {
                        userId: userId,
                        completed: true,
                      },
                      select: {
                        completed: true,
                      },
                    }
                  : false,
              },
            },
          },
        },
      },
    }),
  ])

  if (!activeCourses.length) {
    return []
  }

  const coursesWithProgress = activeCourses.map((course) => {
    const courseLessons = course.sections.flatMap((section) => section.lessons)
    const totalLessons = courseLessons.length

    const courseProblems = courseLessons.flatMap((lesson) => lesson.problems)
    const totalProblems = courseProblems.length

    const problemsByDifficulty = courseProblems.reduce(
      (acc, problem) => {
        acc[problem.difficulty] = (acc[problem.difficulty] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    const completedLessons = user
      ? courseLessons.reduce(
          (acc, lesson) => acc + (lesson.lessonProgress?.length ? 1 : 0),
          0,
        )
      : 0

    const completedProblems = user
      ? courseProblems.reduce(
          (acc, problem) => acc + (problem.problemProgress?.length ? 1 : 0),
          0,
        )
      : 0

    return {
      ...course,
      metadata: {
        lessons: {
          total: totalLessons,
          free: courseLessons.filter((lesson) => lesson.access === 'FREE')
            .length,
          premium: courseLessons.filter((lesson) => lesson.access === 'PREMIUM')
            .length,
        },
        problems: {
          total: totalProblems,
          byDifficulty: problemsByDifficulty,
        },
      },
      progress: user
        ? {
            lessonProgress: {
              completed: completedLessons,
              total: totalLessons,
              percentage: (completedLessons / totalLessons) * 100,
            },
            problemProgress: {
              completed: completedProblems,
              total: totalProblems,
              percentage:
                totalProblems > 0
                  ? (completedProblems / totalProblems) * 100
                  : 0,
            },
          }
        : null,
      sections: course.sections.map((section) => ({
        ...section,
        lessons: section.lessons.map((lesson) => ({
          ...lesson,
          isCompleted: lesson.lessonProgress?.length > 0,
          problems: lesson.problems.map((problem) => ({
            ...problem,
            isCompleted: problem.problemProgress?.length > 0,
          })),
        })),
      })),
    }
  })

  return coursesWithProgress.sort((a, b) => a.order - b.order)
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
