/**
 * Prune stale content rows left in the DB that are no longer in the content
 * (removed problems, and pre-stable-id renamed-away duplicates). After the
 * stable-id sync, every LIVE entity has a contentId; stale rows have
 * contentId = NULL. Removing them keeps the DB equal to the content so
 * completion percentages are accurate (users can reach 100%).
 *
 * Deletes cascade to child rows + user progress on those (removed) problems —
 * which is correct: you cannot complete a problem that no longer exists.
 *
 * Guardrails: refuses to run before the sync (if NO rows have a contentId), and
 * refuses if it would delete more than HALF of an entity (sanity vs accidents).
 * Dry-run by default.
 *
 * Usage:
 *   tsx src/scripts/prune-stale-content.ts            # DRY RUN
 *   tsx src/scripts/prune-stale-content.ts --apply
 */
import prisma from '@/lib/prisma'

const apply = process.argv.includes('--apply')

type Entity = {
  name: string
  countNull: () => Promise<number>
  countTotal: () => Promise<number>
  countProgress: () => Promise<number>
  sampleNull: () => Promise<{ slug: string }[]>
  deleteNull: () => Promise<{ count: number }>
}

const entities: Entity[] = [
  {
    name: 'problem',
    countNull: () => prisma.problem.count({ where: { contentId: null } }),
    countTotal: () => prisma.problem.count(),
    countProgress: () =>
      prisma.userProblemProgress.count({ where: { problem: { contentId: null } } }),
    sampleNull: () => prisma.problem.findMany({ where: { contentId: null }, select: { slug: true }, take: 15 }),
    deleteNull: () => prisma.problem.deleteMany({ where: { contentId: null } }),
  },
  {
    name: 'lesson',
    countNull: () => prisma.lesson.count({ where: { contentId: null } }),
    countTotal: () => prisma.lesson.count(),
    countProgress: () =>
      prisma.userLessonProgress.count({ where: { lesson: { contentId: null } } }),
    sampleNull: () => prisma.lesson.findMany({ where: { contentId: null }, select: { slug: true }, take: 15 }),
    deleteNull: () => prisma.lesson.deleteMany({ where: { contentId: null } }),
  },
  {
    name: 'section',
    countNull: () => prisma.section.count({ where: { contentId: null } }),
    countTotal: () => prisma.section.count(),
    countProgress: async () => 0,
    sampleNull: () => prisma.section.findMany({ where: { contentId: null }, select: { slug: true }, take: 15 }),
    deleteNull: () => prisma.section.deleteMany({ where: { contentId: null } }),
  },
  {
    name: 'course',
    countNull: () => prisma.course.count({ where: { contentId: null } }),
    countTotal: () => prisma.course.count(),
    countProgress: async () => 0,
    sampleNull: () => prisma.course.findMany({ where: { contentId: null }, select: { slug: true }, take: 15 }),
    deleteNull: () => prisma.course.deleteMany({ where: { contentId: null } }),
  },
  {
    name: 'resource',
    countNull: () => prisma.resource.count({ where: { contentId: null } }),
    countTotal: () => prisma.resource.count(),
    countProgress: async () => 0,
    sampleNull: () => prisma.resource.findMany({ where: { contentId: null }, select: { slug: true }, take: 15 }),
    deleteNull: () => prisma.resource.deleteMany({ where: { contentId: null } }),
  },
]

async function main() {
  console.log(`${apply ? '🚀 APPLYING' : '🔎 DRY RUN'} — pruning stale (contentId IS NULL) rows\n`)

  // Guard: never run before the sync has populated contentIds.
  const problemsWithCid = await prisma.problem.count({ where: { NOT: { contentId: null } } })
  if (problemsWithCid === 0) {
    console.error('❌ REFUSING: no problems have a contentId — the sync/backfill has not run. Aborting.')
    process.exit(1)
  }

  let abort = false
  for (const e of entities) {
    const [nul, total, prog] = await Promise.all([e.countNull(), e.countTotal(), e.countProgress()])
    if (nul === 0) { console.log(`${e.name.padEnd(8)}: 0 stale`); continue }
    const pct = Math.round((nul / total) * 100)
    const sample = (await e.sampleNull()).map((r) => r.slug)
    console.log(`${e.name.padEnd(8)}: ${nul}/${total} stale (${pct}%) | cascades ${prog} progress row(s)`)
    console.log(`  e.g. ${sample.join(', ')}${nul > 15 ? ` … +${nul - 15}` : ''}`)
    if (nul > total / 2) {
      console.error(`  ❌ SANITY: >50% of ${e.name} rows are stale — refusing to delete (investigate first).`)
      abort = true
    }
  }
  if (abort) { console.error('\nAborting — sanity guard tripped.'); process.exit(1) }

  if (apply) {
    for (const e of entities) {
      const res = await e.deleteNull()
      if (res.count) console.log(`deleted ${res.count} stale ${e.name}(s)`)
    }
    console.log('\n✅ prune applied.')
  } else {
    console.log('\nRe-run with --apply to delete (run AFTER the content sync; snapshot first).')
  }
}

main().catch((e) => { console.error('ERROR:', (e as Error)?.message || e); process.exit(1) }).finally(() => prisma.$disconnect())
