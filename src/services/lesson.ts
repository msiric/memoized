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
  contentId: string,
  courseSlug: string,
  courseTitle: string,
  courseDescription: string,
  courseBody: string | null,
  courseHref: string,
  courseOrder: number,
  serializedContent?: Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue,
) => {
  const data = {
    contentId,
    title: courseTitle,
    description: courseDescription,
    body: courseBody,
    serializedBody: serializedContent,
    order: courseOrder,
    href: courseHref,
    slug: courseSlug,
  }
  const existing =
    (await prisma.course.findUnique({ where: { contentId }, select: { id: true } })) ??
    (await prisma.course.findUnique({ where: { slug: courseSlug }, select: { id: true } }))
  if (existing) {
    return prisma.course.update({ where: { id: existing.id }, data })
  }
  return prisma.course.create({ data })
}

export const upsertSection = async (
  contentId: string,
  sectionSlug: string,
  sectionTitle: string,
  sectionDescription: string,
  sectionContent: string,
  sectionOrder: number,
  sectionHref: string,
  courseId: string,
  serializedContent?: Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue,
) => {
  const data = {
    contentId,
    title: sectionTitle,
    description: sectionDescription,
    body: sectionContent,
    slug: sectionSlug,
    order: sectionOrder,
    href: sectionHref,
    courseId,
    ...(serializedContent !== undefined && { serializedBody: serializedContent }),
  }
  const existing =
    (await prisma.section.findUnique({ where: { contentId }, select: { id: true } })) ??
    (await prisma.section.findUnique({ where: { slug: sectionSlug }, select: { id: true } }))
  if (existing) {
    return prisma.section.update({ where: { id: existing.id }, data })
  }
  return prisma.section.create({ data })
}

export const upsertLesson = async (
  contentId: string,
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
  const data = {
    contentId,
    title: lessonTitle,
    description: lessonDescription,
    order: lessonOrder,
    slug: lessonSlug,
    body: lessonContent,
    serializedBody: serializedContent,
    access: lessonAccess,
    href: lessonHref,
    sectionId,
  }
  // Match on stable contentId; fall back to legacy slug for rows synced before
  // contentId existed. Update by row id so UserLessonProgress FKs survive a rename.
  const existing =
    (await prisma.lesson.findUnique({ where: { contentId }, select: { id: true } })) ??
    (await prisma.lesson.findUnique({ where: { slug: lessonSlug }, select: { id: true } }))
  if (existing) {
    return prisma.lesson.update({ where: { id: existing.id }, data })
  }
  return prisma.lesson.create({ data })
}

export const upsertProblem = async (
  contentId: string,
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
  const data = {
    contentId,
    href: problemHref,
    link: problemLink,
    title: problemTitle,
    slug: problemSlug,
    lessonId,
    difficulty: problemDifficulty,
    question: problemQuestion,
    answer: problemAnswer,
    type: problemType,
    serializedAnswer,
  }

  // Identify the row by its stable contentId; fall back to the legacy slug for
  // rows synced before contentId existed (they get contentId set on this pass).
  // Updating by the row's own id keeps it stable, so every UserProblemProgress
  // FK survives even when the title/slug changes — no orphan, no cascade.
  const existing =
    (await prisma.problem.findUnique({ where: { contentId }, select: { id: true } })) ??
    (await prisma.problem.findUnique({ where: { slug: problemSlug }, select: { id: true } }))

  if (existing) {
    return prisma.problem.update({ where: { id: existing.id }, data })
  }
  return prisma.problem.create({ data })
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
