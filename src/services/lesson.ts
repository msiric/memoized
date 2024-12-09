import prisma from '@/lib/prisma'
import { AccessOptions, ProblemDifficulty, ProblemType } from '@prisma/client'

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
  return prisma.userLessonProgress.upsert({
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
}

export const getSectionBySlug = async (sectionSlug: string) => {
  const section = await prisma.section.findUnique({
    where: { slug: sectionSlug },
    select: { id: true, course: { select: { slug: true } } },
  })

  if (!section) {
    return null
  }

  return section
}

export const getLessonBySlug = async (lessonSlug: string) => {
  const lesson = await prisma.lesson.findUnique({
    where: { slug: lessonSlug },
    select: {
      id: true,
      problems: true,
      title: true,
      access: true,
      section: { select: { slug: true, course: { select: { slug: true } } } },
    },
  })

  if (!lesson) {
    return null
  }

  return lesson
}

export const upsertCourse = async (
  courseSlug: string,
  courseTitle: string,
  courseDescription: string,
  courseHref: string,
  courseOrder: number,
) => {
  return prisma.course.upsert({
    where: { slug: courseSlug },
    update: {
      title: courseTitle,
      description: courseDescription,
      order: courseOrder,
      href: courseHref,
    },
    create: {
      title: courseTitle,
      description: courseDescription,
      order: courseOrder,
      slug: courseSlug,
      href: courseHref,
    },
  })
}

export const upsertSection = async (
  sectionSlug: string,
  sectionTitle: string,
  sectionDescription: string,
  sectionContent: string,
  sectionOrder: number,
  sectionHref: string,
  courseId: string,
) => {
  return prisma.section.upsert({
    where: { slug: sectionSlug },
    update: {
      title: sectionTitle,
      description: sectionDescription,
      body: sectionContent,
      order: sectionOrder,
      href: sectionHref,
      courseId: courseId,
    },
    create: {
      title: sectionTitle,
      description: sectionDescription,
      body: sectionContent,
      slug: sectionSlug,
      order: sectionOrder,
      href: sectionHref,
      courseId: courseId,
    },
  })
}

export const upsertLesson = async (
  lessonSlug: string,
  lessonTitle: string,
  lessonDescription: string,
  lessonContent: string,
  lessonOrder: number,
  lessonAccess: AccessOptions,
  lessonHref: string,
  sectionId: string,
) => {
  return prisma.lesson.upsert({
    where: { slug: lessonSlug },
    update: {
      title: lessonTitle,
      description: lessonDescription,
      order: lessonOrder,
      body: lessonContent,
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
      access: lessonAccess,
      href: lessonHref,
      sectionId: sectionId,
    },
  })
}

export const upsertProblem = async (
  problemHref: string,
  problemTitle: string,
  problemDifficulty: ProblemDifficulty,
  problemQuestion: string,
  problemAnswer: string,
  problemType: ProblemType,
  lessonId: string,
) => {
  return prisma.problem.upsert({
    where: { href: problemHref },
    update: {
      title: problemTitle,
      lessonId: lessonId,
      difficulty: problemDifficulty,
      question: problemQuestion,
      answer: problemAnswer,
      type: problemType,
    },
    create: {
      title: problemTitle,
      href: problemHref,
      lessonId: lessonId,
      difficulty: problemDifficulty,
      question: problemQuestion,
      answer: problemAnswer,
      type: problemType,
    },
  })
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
        question: true,
        answer: true,
        type: true,
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
          question: true,
          answer: true,
          type: true,
          difficulty: true,
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
          question: true,
          answer: true,
          type: true,
          difficulty: true,
        },
      },
    },
    orderBy: { order: 'asc' },
  })
  return { allLessons }
}
