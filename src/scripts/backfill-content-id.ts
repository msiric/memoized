/**
 * One-time backfill of `contentId` for Course, Section, Lesson, Problem, and
 * Resource rows that existed before stable identity was introduced. Sets
 * contentId by DIRECT slug match only — the row's current slug maps to a content
 * entity (its title/slug is unchanged). Never guesses.
 *
 * Rows whose slug is NOT in the current content (renamed / moved / removed) are
 * left untouched and reported as "unresolved". Progress-bearing renames are
 * reconciled separately by reconcile-progress-renames.ts (which aligns the slug
 * so the sync updates the row IN PLACE); everything else simply creates fresh on
 * sync — those old rows detach harmlessly because they carry no user progress.
 *
 * Nothing is deleted; only contentId is set. Idempotent (skips rows already set).
 *
 * Usage:
 *   tsx src/scripts/backfill-content-id.ts                 # DRY RUN
 *   tsx src/scripts/backfill-content-id.ts --apply
 *   tsx src/scripts/backfill-content-id.ts --content <dir>
 */
import { CONTENT_FOLDER } from '@/constants'
import { buildContentIdMaps } from '@/lib/content-identity'
import prisma from '@/lib/prisma'
import fs from 'fs'
import path from 'path'

function arg(name: string, def?: string) {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : def
}

type SlugToContentId = Record<string, string>
let apply = false

async function backfillEntity(
  name: string,
  rows: Array<{ id: string; slug: string; contentId: string | null }>,
  map: SlugToContentId,
  update: (id: string, contentId: string) => Promise<unknown>,
) {
  let direct = 0, already = 0, unresolved = 0, conflicts = 0
  const unresolvedList: string[] = []
  const seen = new Set<string>()
  for (const r of rows) {
    if (r.contentId) { already++; continue }
    const cid = map[r.slug]
    if (!cid) { unresolved++; unresolvedList.push(r.slug); continue }
    if (seen.has(cid)) { conflicts++; console.error(`  ${name}: two rows -> same contentId ${cid}`); continue }
    seen.add(cid)
    direct++
    if (apply) {
      try { await update(r.id, cid) } catch (e) { conflicts++; console.error(`  ${name} conflict ${r.slug}->${cid}: ${(e as Error).message}`) }
    }
  }
  console.log(`${name.padEnd(8)}: ${apply ? 'set' : 'would set'} direct=${direct} | already=${already} | unresolved=${unresolved} | conflicts=${conflicts}`)
  if (unresolvedList.length) console.log(`  unresolved ${name}: ${unresolvedList.slice(0, 20).join(', ')}${unresolvedList.length > 20 ? ` … +${unresolvedList.length - 20}` : ''}`)
  return unresolved
}

async function main() {
  apply = process.argv.includes('--apply')
  const contentDir = arg('content', path.join('src', CONTENT_FOLDER))!
  if (!fs.existsSync(path.join(contentDir, 'js-track')) && !fs.existsSync(path.join(contentDir, 'dsa-track'))) {
    console.error(`No js-track/dsa-track under ${contentDir}`); process.exit(1)
  }
  const maps = buildContentIdMaps(contentDir)

  console.log(`${apply ? '🚀 APPLYING' : '🔎 DRY RUN'} — backfilling contentId (direct slug match only)\n`)
  let unresolved = 0
  unresolved += await backfillEntity('course', await prisma.course.findMany({ select: { id: true, slug: true, contentId: true } }), maps.course, (id, contentId) => prisma.course.update({ where: { id }, data: { contentId } }))
  unresolved += await backfillEntity('section', await prisma.section.findMany({ select: { id: true, slug: true, contentId: true } }), maps.section, (id, contentId) => prisma.section.update({ where: { id }, data: { contentId } }))
  unresolved += await backfillEntity('lesson', await prisma.lesson.findMany({ select: { id: true, slug: true, contentId: true } }), maps.lesson, (id, contentId) => prisma.lesson.update({ where: { id }, data: { contentId } }))
  unresolved += await backfillEntity('problem', await prisma.problem.findMany({ select: { id: true, slug: true, contentId: true } }), maps.problem, (id, contentId) => prisma.problem.update({ where: { id }, data: { contentId } }))
  unresolved += await backfillEntity('resource', await prisma.resource.findMany({ select: { id: true, slug: true, contentId: true } }), maps.resource, (id, contentId) => prisma.resource.update({ where: { id }, data: { contentId } }))

  console.log(`\nTOTAL unresolved (renamed/moved/removed — reconciled separately or create fresh on sync): ${unresolved}`)
  if (!apply) console.log(`Re-run with --apply to write.`)
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(async () => { await prisma.$disconnect() })
