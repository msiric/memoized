import prisma from '@/lib/prisma'
import { revalidateLessonProgress } from '@/lib/cache'
import { ServiceError } from '@/lib/error-tracking'

export type MarkLessonArgs = {
  userId: string
  lessonId: string
  completed: boolean
}

export const markLessonProgress = async ({
  userId,
  lessonId,
  completed,
}: MarkLessonArgs) => {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { id: true },
  })

  if (!lesson) {
    throw new ServiceError('Lesson not found', true, {
      feature: 'lesson',
      action: 'mark-progress',
    })
  }

  const result = await prisma.userLessonProgress.upsert({
    where: {
      userId_lessonId: {
        userId,
        lessonId,
      },
    },
    update: {
      completed,
      completedAt: new Date(),
    },
    create: {
      userId,
      lessonId,
      completed,
      completedAt: new Date(),
    },
  })

  revalidateLessonProgress({ userId, lessonId })

  return result
}

export const getLessonMetadataBySlug = async (lessonSlug: string) => {
  const lesson = await prisma.lesson.findUnique({
    where: { slug: lessonSlug },
    select: { title: true, description: true },
  })

  return lesson
}

export const getSectionBySlug = async (sectionSlug: string) => {
  const section = await prisma.section.findUnique({
    where: { slug: sectionSlug },
    select: {
      id: true,
      serializedBody: true,
      course: { select: { slug: true } },
    },
  })

  if (!section) {
    return null
  }

  return section
}

export const getSectionsSlugs = async () => {
  const sections = await prisma.section.findMany({
    select: { slug: true, course: { select: { slug: true } } },
  })

  if (!sections?.length) {
    return null
  }

  return sections
}

export const getLessonBySlug = async (lessonSlug: string) => {
  const lesson = await prisma.lesson.findUnique({
    where: {
      slug: lessonSlug,
    },
    select: {
      id: true,
      title: true,
      serializedBody: true,
      body: true, // Required for search indexing (MeiliSearch)
      access: true,
      problems: {
        orderBy: {
          difficulty: 'asc',
        },
        select: {
          id: true,
          difficulty: true,
          href: true,
          link: true,
          title: true,
          createdAt: true,
          updatedAt: true,
          lessonId: true,
          type: true,
          question: true,
          slug: true,
          serializedAnswer: true,
        },
      },
      section: {
        select: {
          slug: true,
          course: {
            select: {
              slug: true,
            },
          },
        },
      },
    },
  })

  if (!lesson) {
    return null
  }

  return lesson
}

export const getLessonsSlugs = async () => {
  const lessons = await prisma.lesson.findMany({
    select: {
      slug: true,
      section: { select: { slug: true, course: { select: { slug: true } } } },
    },
  })

  if (!lessons?.length) {
    return null
  }

  return lessons
}

export const getLessonsAndProblems = async () => {
  const [allLessons, allProblems] = await Promise.all([
    prisma.lesson.findMany({
      select: {
        id: true,
        title: true,
        href: true,
        description: true,
        access: true,
        order: true,
        slug: true,
        section: {
          select: {
            id: true,
            title: true,
            href: true,
            order: true,
            slug: true,
            description: true,
            course: {
              select: {
                id: true,
                title: true,
                description: true,
                slug: true,
                order: true,
                href: true,
              },
            },
          },
        },
      },
      orderBy: { order: 'asc' },
    }),
    prisma.problem.findMany({
      select: {
        id: true,
      },
    }),
  ])
  return { allLessons, allProblems }
}

export const getLessonsAndProblemsCounts = async () => {
  const [lessonCount, problemCount] = await Promise.all([
    prisma.lesson.count(),
    prisma.problem.count(),
  ])
  return { lessonCount, problemCount }
}

export const getProblemsCounts = async () => {
  const problemCount = await prisma.problem.count()
  return { problemCount }
}

export const getLessonsWithProblems = async () => {
  const allLessons = await prisma.lesson.findMany({
    select: {
      id: true,
      title: true,
      href: true,
      description: true,
      access: true,
      slug: true,
      order: true,
      section: {
        select: {
          order: true,
        },
      },
      problems: {
        select: {
          id: true,
          title: true,
          href: true,
          difficulty: true,
          slug: true,
          link: true,
        },
      },
    },
    orderBy: { order: 'asc' },
  })
  return { allLessons }
}

export const getLessonsWithResourcesAndProblems = async () => {
  const allLessons = await prisma.lesson.findMany({
    select: {
      id: true,
      title: true,
      href: true,
      description: true,
      access: true,
      slug: true,
      order: true,
      section: {
        select: {
          order: true,
        },
      },
      resources: {
        select: {
          id: true,
          title: true,
          href: true,
          order: true,
          access: true,
        },
      },
      problems: {
        select: {
          id: true,
          title: true,
          href: true,
          difficulty: true,
          slug: true,
          link: true,
        },
      },
    },
    orderBy: { order: 'asc' },
  })
  return { allLessons }
}
