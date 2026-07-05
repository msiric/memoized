/**
 * Prune stale content rows so the database always equals the content.
 *
 * A row is stale when its `contentId` is not among the contentIds the content
 * currently defines — i.e. the entity was removed (or is a pre-stable-id
 * renamed-away duplicate whose slug no longer matches anything). Keeping the DB
 * == the content is what makes completion percentages correct: a user can only
 * reach 100% when the DB contains exactly the problems the content ships.
 *
 * Deletes cascade to child rows and to user progress on removed problems — which
 * is correct: you cannot have completed a problem that no longer exists.
 *
 * Guardrails (a content-copy failure must never wipe the DB):
 *   - Refuses to run before the sync/backfill has populated any contentIds.
 *   - Refuses if the content defines zero problems (a failed content copy).
 *   - HARD SANITY CAP: refuses if it would delete more than `--max` of any
 *     entity's rows (default 10%). Large, deliberate removals require a human to
 *     re-run with a raised cap.
 *
 * Dry-run by default. Runs automatically (with --apply) after `sync:all` in the
 * content pipeline so "DB == content" is a self-maintaining invariant.
 *
 * Usage:
 *   tsx src/scripts/prune-stale-content.ts                     # DRY RUN
 *   tsx src/scripts/prune-stale-content.ts --apply
 *   tsx src/scripts/prune-stale-content.ts --content <dir> --max 0.1
 */
import { CONTENT_FOLDER } from '@/constants'
import { validContentIds, type EntityName } from '@/lib/content-identity'
import prisma from '@/lib/prisma'
import path from 'path'

const apply = process.argv.includes('--apply')
function arg(name: string, def: string) {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : def
}
const contentDir = arg('content', path.join('src', CONTENT_FOLDER))
const MAX_FRACTION = Number(arg('max', '0.1'))

type EntityOps = {
  name: EntityName
  findAll: () => Promise<{ id: string; contentId: string | null }[]>
  deleteByIds: (ids: string[]) => Promise<unknown>
  // How many user-progress rows the deletion would cascade away (reporting only).
  cascadedProgress: (ids: string[]) => Promise<number>
}

// Leaf-to-root order: deleting problems before their lessons keeps counts exact
// (a parent delete can't cascade away rows we are separately about to delete).
const entities: EntityOps[] = [
  {
    name: 'problem',
    findAll: () => prisma.problem.findMany({ select: { id: true, contentId: true } }),
    deleteByIds: (ids) => prisma.problem.deleteMany({ where: { id: { in: ids } } }),
    cascadedProgress: (ids) =>
      prisma.userProblemProgress.count({ where: { problemId: { in: ids } } }),
  },
  {
    name: 'resource',
    findAll: () => prisma.resource.findMany({ select: { id: true, contentId: true } }),
    deleteByIds: (ids) => prisma.resource.deleteMany({ where: { id: { in: ids } } }),
    cascadedProgress: async () => 0,
  },
  {
    name: 'lesson',
    findAll: () => prisma.lesson.findMany({ select: { id: true, contentId: true } }),
    deleteByIds: (ids) => prisma.lesson.deleteMany({ where: { id: { in: ids } } }),
    cascadedProgress: (ids) =>
      prisma.userLessonProgress.count({ where: { lessonId: { in: ids } } }),
  },
  {
    name: 'section',
    findAll: () => prisma.section.findMany({ select: { id: true, contentId: true } }),
    deleteByIds: (ids) => prisma.section.deleteMany({ where: { id: { in: ids } } }),
    cascadedProgress: async () => 0,
  },
  {
    name: 'course',
    findAll: () => prisma.course.findMany({ select: { id: true, contentId: true } }),
    deleteByIds: (ids) => prisma.course.deleteMany({ where: { id: { in: ids } } }),
    cascadedProgress: async () => 0,
  },
]

async function main() {
  console.log(
    `${apply ? '🚀 APPLYING' : '🔎 DRY RUN'} — prune rows whose contentId is not in the content ` +
      `(sanity cap ${Math.round(MAX_FRACTION * 100)}% per entity)\n`
  )

  const valid = validContentIds(contentDir)

  // Guard: never run before the sync/backfill has populated contentIds — every
  // row would look stale and get wiped.
  const problemsWithContentId = await prisma.problem.count({ where: { NOT: { contentId: null } } })
  if (problemsWithContentId === 0) {
    console.error('❌ REFUSING: no problems have a contentId — sync/backfill has not run. Aborting.')
    process.exit(1)
  }
  // Guard: content must actually define problems (a failed content copy would
  // make everything "stale").
  if (valid.problem.size === 0) {
    console.error('❌ REFUSING: content defines 0 problems — content copy likely failed. Aborting.')
    process.exit(1)
  }

  const plan: { name: EntityName; ids: string[] }[] = []
  let capTripped = false

  for (const e of entities) {
    const rows = await e.findAll()
    const staleIds = rows
      .filter((r) => !r.contentId || !valid[e.name].has(r.contentId))
      .map((r) => r.id)

    if (staleIds.length === 0) {
      console.log(`${e.name.padEnd(8)}: 0 stale / ${rows.length}`)
      continue
    }

    const fraction = staleIds.length / rows.length
    const progress = await e.cascadedProgress(staleIds)
    console.log(
      `${e.name.padEnd(8)}: ${staleIds.length} stale / ${rows.length} ` +
        `(${Math.round(fraction * 100)}%) — cascades ${progress} progress row(s)`
    )

    if (fraction > MAX_FRACTION) {
      console.error(
        `  ❌ SANITY CAP: ${Math.round(fraction * 100)}% of ${e.name} rows are stale ` +
          `(> ${Math.round(MAX_FRACTION * 100)}%). Refusing. Re-run with a raised --max if intentional.`
      )
      capTripped = true
    }
    plan.push({ name: e.name, ids: staleIds })
  }

  if (capTripped) {
    console.error('\nAborting — sanity cap tripped. Investigate the content before pruning.')
    process.exit(1)
  }

  if (!plan.length) {
    console.log('\nNothing to prune — DB equals content. ✅')
    return
  }

  if (!apply) {
    console.log('\nRe-run with --apply to delete the stale rows above.')
    return
  }

  for (const e of entities) {
    const p = plan.find((x) => x.name === e.name)
    if (!p) continue
    await e.deleteByIds(p.ids)
    console.log(`deleted ${p.ids.length} stale ${e.name}(s)`)
  }
  console.log('\n✅ prune applied — DB now equals content.')
}

main()
  .catch((e) => {
    console.error('ERROR:', (e as Error)?.message || e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
