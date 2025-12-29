import prisma from '@/lib/prisma'
import {
  AccessOptions,
  ProblemDifficulty,
  ProblemType,
  Prisma,
} from '@prisma/client'
import { revalidateLessonProgress } from '@/lib/cache'

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

export const upsertCourse = async (
  courseSlug: string,
  courseTitle: string,
  courseDescription: string,
  courseBody: string | null,
  courseHref: string,
  courseOrder: number,
  serializedContent?: Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue,
) => {
  const result = await prisma.course.upsert({
    where: { slug: courseSlug },
    update: {
      title: courseTitle,
      description: courseDescription,
      body: courseBody,
      serializedBody: serializedContent,
      order: courseOrder,
      href: courseHref,
    },
    create: {
      title: courseTitle,
      description: courseDescription,
      body: courseBody,
      serializedBody: serializedContent,
      order: courseOrder,
      slug: courseSlug,
      href: courseHref,
    },
  })

  return result
}

export const upsertSection = async (
  sectionSlug: string,
  sectionTitle: string,
  sectionDescription: string,
  sectionContent: string,
  sectionOrder: number,
  sectionHref: string,
  courseId: string,
  serializedContent?: Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue,
) => {
  const result = await prisma.section.upsert({
    where: { slug: sectionSlug },
    update: {
      title: sectionTitle,
      description: sectionDescription,
      body: sectionContent,
      order: sectionOrder,
      href: sectionHref,
      courseId: courseId,
      ...(serializedContent !== undefined && {
        serializedBody: serializedContent,
      }),
    },
    create: {
      title: sectionTitle,
      description: sectionDescription,
      body: sectionContent,
      slug: sectionSlug,
      order: sectionOrder,
      href: sectionHref,
      courseId: courseId,
      ...(serializedContent !== undefined && {
        serializedBody: serializedContent,
      }),
    },
  })

  return result
}

export const upsertLesson = async (
  lessonSlug: string,
  lessonTitle: string,
  lessonDescription: string,
  lessonContent: string,
  serializedContent: Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue,
  lessonOrder: number,
  lessonAccess: AccessOptions,
  lessonHref: string,
  sectionId: string,
) => {
  const result = await prisma.lesson.upsert({
    where: { slug: lessonSlug },
    update: {
      title: lessonTitle,
      description: lessonDescription,
      order: lessonOrder,
      body: lessonContent,
      serializedBody: serializedContent,
      access: lessonAccess,
      href: lessonHref,
      sectionId: sectionId,
    },
    create: {
      title: lessonTitle,
      description: lessonDescription,
      order: lessonOrder,
      slug: lessonSlug,
      body: lessonContent,
      serializedBody: serializedContent,
      access: lessonAccess,
      href: lessonHref,
      sectionId: sectionId,
    },
  })

  return result
}

export const upsertProblem = async (
  problemSlug: string,
  problemHref: string,
  problemLink: string,
  problemTitle: string,
  problemDifficulty: ProblemDifficulty,
  problemQuestion: string,
  problemAnswer: string,
  problemType: ProblemType,
  lessonId: string,
  serializedAnswer?: Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue,
) => {
  const result = await prisma.problem.upsert({
    where: { slug: problemSlug },
    update: {
      href: problemHref,
      link: problemLink,
      title: problemTitle,
      lessonId: lessonId,
      difficulty: problemDifficulty,
      question: problemQuestion,
      answer: problemAnswer,
      type: problemType,
      serializedAnswer: serializedAnswer,
    },
    create: {
      title: problemTitle,
      slug: problemSlug,
      href: problemHref,
      link: problemLink,
      lessonId: lessonId,
      difficulty: problemDifficulty,
      question: problemQuestion,
      answer: problemAnswer,
      type: problemType,
      serializedAnswer: serializedAnswer,
    },
  })

  return result
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
        title: true,
        difficulty: true,
        href: true,
        link: true,
        question: true,
        serializedAnswer: true,
        type: true,
        slug: true,
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
          link: true,
          question: true,
          type: true,
          difficulty: true,
          slug: true,
          serializedAnswer: true,
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
          link: true,
          question: true,
          type: true,
          difficulty: true,
          slug: true,
          serializedAnswer: true,
        },
      },
    },
    orderBy: { order: 'asc' },
  })
  return { allLessons }
}
