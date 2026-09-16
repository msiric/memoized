import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { CatalogStats, parseCatalogStats } from '@/types/catalog-stats'

/** A committed public catalog snapshot; no content, identity, access or user reads. */
export async function getPublicCatalogStats(): Promise<CatalogStats> {
  const [courses, sections, lessons, problems, resources] =
    await prisma.$transaction(
      [
        prisma.course.count({ where: { isActive: true } }),
        prisma.section.count({ where: { course: { isActive: true } } }),
        prisma.lesson.count({
          where: { section: { course: { isActive: true } } },
        }),
        prisma.problem.count({
          where: { lesson: { section: { course: { isActive: true } } } },
        }),
        prisma.resource.count({
          where: {
            OR: [
              { lessonId: null },
              { lesson: { section: { course: { isActive: true } } } },
            ],
          },
        }),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    )

  const stats = parseCatalogStats({
    courses,
    sections,
    lessons,
    problems,
    resources,
  })
  if (!stats) throw new Error('Invalid catalog count snapshot')
  return stats
}
