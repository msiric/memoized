import prisma from '@/lib/prisma'

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
    select: { id: true },
  })

  if (!section) {
    return null
  }

  return section
}

export const getLessonBySlug = async (lessonSlug: string) => {
  const lesson = await prisma.lesson.findUnique({
    where: { slug: lessonSlug },
    select: { id: true, problems: true, title: true, access: true },
  })

  if (!lesson) {
    return null
  }

  return lesson
}

import { AccessOptions, ProblemDifficulty } from '@prisma/client'

export const upsertCourse = async (
  courseSlug: string,
  courseTitle: string,
  courseDescription: string,
  courseOrder: number,
) => {
  return prisma.course.upsert({
    where: { slug: courseSlug },
    update: {
      title: courseTitle,
      description: courseDescription,
      order: courseOrder,
      href: '',
    },
    create: {
      title: courseTitle,
      description: courseDescription,
      order: courseOrder,
      slug: courseSlug,
      href: '',
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
  lessonId: string,
  problemDifficulty: ProblemDifficulty,
) => {
  return prisma.problem.upsert({
    where: { href: problemHref },
    update: {
      title: problemTitle,
      lessonId: lessonId,
      difficulty: problemDifficulty,
    },
    create: {
      title: problemTitle,
      href: problemHref,
      lessonId: lessonId,
      difficulty: problemDifficulty,
    },
  })
}
