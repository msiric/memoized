/**
 * Pre-flight guardrail for the content sync. For every content entity (Course,
 * Section, Lesson, Problem, Resource) it checks whether any DB row would be
 * orphaned by a sync — i.e. NEITHER its contentId NOR its slug matches the
 * current content. Since the sync's upsert matches on contentId-or-slug, such a
 * row would create a duplicate and (for Lesson/Problem) strand user progress.
 *
 * Exits non-zero if orphans-to-be are found, blocking the sync until they are
 * reconciled (backfill-content-id.ts) or confirmed intentional (--allow <n>).
 * Read-only; never mutates.
 *
 * Usage: tsx src/scripts/check-orphaned-problems.ts [--content <dir>] [--allow <n>]
 */
import { CONTENT_FOLDER, SLUGIFY_OPTIONS } from '@/constants'
import { completeCurriculum } from '@/constants/curriculum'
import prisma from '@/lib/prisma'
import fs from 'fs'
import path from 'path'
import slugify from 'slugify'

slugify.extend({ '/': '-' })
const slug = (t: string) => slugify(t, SLUGIFY_OPTIONS)

function arg(name: string, def?: string) {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : def
}

function buildContent(contentDir: string) {
  const mk = () => ({ ids: new Set<string>(), slugs: new Set<string>() })
  const e = { course: mk(), section: mk(), lesson: mk(), problem: mk(), resource: mk() }
  e.resource.ids.add('intro'); e.resource.slugs.add('intro')
  for (const c of completeCurriculum) {
    e.course.ids.add(c.id); e.course.slugs.add(slug(c.title))
    for (const s of c.sections) {
      const sectionCid = `${c.id}${s.id}`
      e.section.ids.add(sectionCid); e.section.slugs.add(slug(s.title))
      const cfgPath = path.join(contentDir, c.id, s.id, '_lessons.json')
      if (!fs.existsSync(cfgPath)) continue
      const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'))
      for (const l of cfg.lessons || []) {
        const lessonCid = `${c.id}${s.id}${l.id}`
        e.lesson.ids.add(lessonCid); e.lesson.slugs.add(slug(l.title))
        for (const p of l.problems || []) { e.problem.ids.add(`${lessonCid}/${p.id ?? slug(p.title)}`); e.problem.slugs.add(slug(p.title)) }
        for (const r of l.resources || []) { if (r.id) e.resource.ids.add(r.id); e.resource.slugs.add(slug(r.title)) }
      }
    }
  }
  return e
}

function orphans(rows: Array<{ slug: string; contentId: string | null; title: string }>, content: { ids: Set<string>; slugs: Set<string> }) {
  return rows.filter((r) => !(r.contentId && content.ids.has(r.contentId)) && !content.slugs.has(r.slug))
}

async function main() {
  const contentDir = arg('content', path.join('src', CONTENT_FOLDER))!
  const allow = parseInt(arg('allow', '0')!, 10)
  if (!fs.existsSync(path.join(contentDir, 'js-track')) && !fs.existsSync(path.join(contentDir, 'dsa-track'))) {
    console.error(`No content under ${contentDir}`); process.exit(1)
  }
  const content = buildContent(contentDir)
  const sel = { select: { slug: true, contentId: true, title: true } }
  const [course, section, lesson, problem, resource] = await Promise.all([
    prisma.course.findMany(sel), prisma.section.findMany(sel), prisma.lesson.findMany(sel),
    prisma.problem.findMany(sel), prisma.resource.findMany(sel),
  ])
  const found: Array<[string, ReturnType<typeof orphans>]> = [
    ['course', orphans(course, content.course)],
    ['section', orphans(section, content.section)],
    ['lesson', orphans(lesson, content.lesson)],
    ['problem', orphans(problem, content.problem)],
    ['resource', orphans(resource, content.resource)],
  ]
  const total = found.reduce((n, [, o]) => n + o.length, 0)
  console.log(found.map(([k, o]) => `${k}=${o.length}`).join(' '), `| total orphans-to-be: ${total}`)

  if (total > allow) {
    console.error(`\n❌ ${total} DB rows have no matching contentId or slug in current content — syncing now would orphan them.\n`)
    for (const [k, o] of found) o.slice(0, 15).forEach((r) => console.error(`   ${k}: ${r.slug} ("${r.title}")`))
    console.error(`\n   Reconcile: tsx src/scripts/backfill-content-id.ts --apply   (or --allow ${total} for intentional removals).`)
    process.exit(1)
  }
  console.log('✅ No unexpected orphans. Safe to sync.')
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(async () => { await prisma.$disconnect() })
