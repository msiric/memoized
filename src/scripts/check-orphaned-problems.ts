/**
 * Manual diagnostic: for every content entity (Course, Section, Lesson, Problem,
 * Resource) it reports DB rows whose stable contentId the content no longer
 * defines (a removed entry, or an edited `id`) — the same staleness rule the
 * prune applies. Read-only; never mutates.
 *
 * NOTE: this is intentionally NOT in the sync pipeline. With stable, explicit-id
 * contentIds, title renames are handled in place by the sync (progress
 * preserved), and the removal-aware prune (prune-stale-content.ts) keeps
 * DB == content automatically under a hard sanity cap. Use this script ad hoc to
 * inspect what prune would remove, or to investigate identity drift.
 *
 * Exits non-zero when orphans are found (beyond --allow), so it can still gate a
 * manual sync if you choose to run it.
 *
 * Usage: tsx src/scripts/check-orphaned-problems.ts [--content <dir>] [--allow <n>]
 */
import { CONTENT_FOLDER } from '@/constants'
import { validContentIds } from '@/lib/content-identity'
import prisma from '@/lib/prisma'
import fs from 'fs'
import path from 'path'

function arg(name: string, def?: string) {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : def
}

// A DB row is an orphan when its stable contentId is not in the content's valid
// set — exactly the staleness rule the prune applies. contentIds are fully
// backfilled, so there is no slug fallback: matching by slug was both vestigial
// and unsafe once two entities can legitimately share a slug across parents.
function orphans(
  rows: Array<{ slug: string; contentId: string | null; title: string }>,
  ids: Set<string>,
) {
  return rows.filter((r) => !(r.contentId && ids.has(r.contentId)))
}

async function main() {
  const contentDir = arg('content', path.join('src', CONTENT_FOLDER))!
  const allow = parseInt(arg('allow', '0')!, 10)
  if (!fs.existsSync(path.join(contentDir, 'js-track')) && !fs.existsSync(path.join(contentDir, 'dsa-track'))) {
    console.error(`No content under ${contentDir}`); process.exit(1)
  }
  const valid = validContentIds(contentDir)
  const sel = { select: { slug: true, contentId: true, title: true } }
  const [course, section, lesson, problem, resource] = await Promise.all([
    prisma.course.findMany(sel), prisma.section.findMany(sel), prisma.lesson.findMany(sel),
    prisma.problem.findMany(sel), prisma.resource.findMany(sel),
  ])
  const found: Array<[string, ReturnType<typeof orphans>]> = [
    ['course', orphans(course, valid.course)],
    ['section', orphans(section, valid.section)],
    ['lesson', orphans(lesson, valid.lesson)],
    ['problem', orphans(problem, valid.problem)],
    ['resource', orphans(resource, valid.resource)],
  ]
  const total = found.reduce((n, [, o]) => n + o.length, 0)
  console.log(found.map(([k, o]) => `${k}=${o.length}`).join(' '), `| total orphans-to-be: ${total}`)

  if (total > allow) {
    console.error(`\n❌ ${total} DB rows have no matching contentId in current content — syncing now would orphan them.\n`)
    for (const [k, o] of found) o.slice(0, 15).forEach((r) => console.error(`   ${k}: ${r.slug} ("${r.title}")`))
    console.error(`\n   These are genuine removals or an edited \`id\`. The sync pipeline prunes removals automatically (yarn prune:content); if any is an accidental id change that would strand progress, fix the id in the content instead. Pass --allow ${total} to acknowledge intentional removals here.`)
    process.exit(1)
  }
  console.log('✅ No unexpected orphans. Safe to sync.')
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(async () => { await prisma.$disconnect() })
