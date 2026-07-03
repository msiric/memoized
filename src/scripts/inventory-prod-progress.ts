/**
 * READ-ONLY production progress inventory.
 *
 * This script performs ONLY SELECT queries (via prisma.$queryRawUnsafe with
 * static SQL). It writes NOTHING — no INSERT/UPDATE/DELETE/DDL. Safe to run
 * against production.
 *
 * Purpose: find which problems / lessons ACTUALLY have user progress in prod,
 * then cross-reference the 322-problem rename map so we reconcile ONLY the
 * progress-bearing renames (never guess, never touch problems no one has done).
 *
 * Run:
 *   DATABASE_URL="<PROD_READONLY_URL>" yarn tsx src/scripts/inventory-prod-progress.ts
 *   # optional: --content ../memoized-content  (defaults to the sibling repo)
 *
 * It deliberately references only columns that exist in prod today (id, slug,
 * title, lessonId) — NOT contentId — so it works before the migration ships.
 */
import { SLUGIFY_OPTIONS } from '@/constants'
import prisma from '@/lib/prisma'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import slugify from 'slugify'

slugify.extend({ '/': '-' })
const slug = (t: string) => slugify(t, SLUGIFY_OPTIONS)

const num = (v: unknown) => (typeof v === 'bigint' ? Number(v) : v)
const norm = (r: Record<string, unknown>[]) =>
  r.map((o) => {
    const x: Record<string, unknown> = {}
    for (const k in o) x[k] = num(o[k])
    return x
  })

function arg(name: string, def: string) {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : def
}

async function main() {
  const contentDir = path.resolve(arg('content', '../memoized-content'))

  // ---------- 1. overall scale (READ-ONLY) ----------
  const [scale] = norm(
    (await prisma.$queryRawUnsafe(`
      SELECT
        (SELECT COUNT(*) FROM "User")                                              AS total_users,
        (SELECT COUNT(*) FROM "UserProblemProgress")                               AS problem_rows,
        (SELECT COUNT(*) FROM "UserProblemProgress" WHERE completed = true)        AS problem_completed,
        (SELECT COUNT(DISTINCT "userId") FROM "UserProblemProgress")               AS users_with_problem_progress,
        (SELECT COUNT(*) FROM "UserLessonProgress")                                AS lesson_rows,
        (SELECT COUNT(*) FROM "UserLessonProgress" WHERE completed = true)         AS lesson_completed,
        (SELECT COUNT(DISTINCT "userId") FROM "UserLessonProgress")                AS users_with_lesson_progress
    `)) as Record<string, unknown>[],
  )

  // ---------- 2. per-problem progress inventory (READ-ONLY) ----------
  const probProg = norm(
    (await prisma.$queryRawUnsafe(`
      SELECT p.slug, p.title,
             COUNT(*)                                    AS progress_rows,
             COUNT(*) FILTER (WHERE upp.completed)       AS completed_rows,
             COUNT(DISTINCT upp."userId")                AS users
      FROM "UserProblemProgress" upp
      JOIN "Problem" p ON p.id = upp."problemId"
      GROUP BY p.slug, p.title
      ORDER BY progress_rows DESC
    `)) as Record<string, unknown>[],
  ) as Array<{ slug: string; title: string; progress_rows: number; completed_rows: number; users: number }>

  // ---------- 3. per-lesson progress inventory (READ-ONLY) ----------
  const lessProg = norm(
    (await prisma.$queryRawUnsafe(`
      SELECT l.slug, l.title,
             COUNT(*)                                    AS progress_rows,
             COUNT(*) FILTER (WHERE ulp.completed)       AS completed_rows,
             COUNT(DISTINCT ulp."userId")                AS users
      FROM "UserLessonProgress" ulp
      JOIN "Lesson" l ON l.id = ulp."lessonId"
      GROUP BY l.slug, l.title
      ORDER BY progress_rows DESC
    `)) as Record<string, unknown>[],
  ) as Array<{ slug: string; title: string; progress_rows: number; completed_rows: number; users: number }>

  // ---------- 4. current content slugs (HEAD of the content repo) ----------
  const files = execSync(`git -C ${contentDir} ls-files content/**/_lessons.json`, {
    encoding: 'utf8',
  })
    .trim()
    .split('\n')
    .filter(Boolean)
  const curProblemSlugs = new Set<string>()
  const curLessonSlugs = new Set<string>()
  for (const f of files) {
    const d = JSON.parse(fs.readFileSync(path.join(contentDir, f), 'utf8'))
    for (const l of d.lessons ?? []) {
      curLessonSlugs.add(slug(l.title))
      for (const pr of l.problems ?? []) curProblemSlugs.add(slug(pr.title))
    }
  }

  // ---------- 5. rename map ----------
  const renameMap: Array<{
    oldSlug: string
    newSlug: string
    oldTitle: string
    newTitle: string
    confidence: number
    review: boolean
  }> = JSON.parse(fs.readFileSync(path.join('prisma', 'problem-rename-map.json'), 'utf8'))
  const byOldSlug = new Map(renameMap.map((e) => [e.oldSlug, e]))

  // ---------- 6. categorize every progress-bearing problem ----------
  const safe: typeof probProg = []
  const worklist: Array<(typeof probProg)[number] & { newSlug: string; newTitle: string; confidence: number; review: boolean; newSlugInContent: boolean }> = []
  const orphan: typeof probProg = []
  for (const pp of probProg) {
    if (curProblemSlugs.has(pp.slug)) {
      safe.push(pp) // slug still present in content → sync updates the same row in place
    } else if (byOldSlug.has(pp.slug)) {
      const e = byOldSlug.get(pp.slug)!
      worklist.push({
        ...pp,
        newSlug: e.newSlug,
        newTitle: e.newTitle,
        confidence: e.confidence,
        review: e.review,
        newSlugInContent: curProblemSlugs.has(e.newSlug),
      })
    } else {
      orphan.push(pp) // slug gone and NOT a tracked rename → investigate (untracked rename or genuine removal)
    }
  }
  const lessonMissing = lessProg.filter((lp) => !curLessonSlugs.has(lp.slug))

  // ---------- 7. human-readable report ----------
  console.log('\n================ PROD PROGRESS INVENTORY (READ-ONLY) ================')
  console.log('scale:', JSON.stringify(scale))
  console.log(`\ndistinct problems with progress: ${probProg.length}`)
  console.log(`  SAFE   (slug unchanged; sync updates in place)        : ${safe.length}`)
  console.log(`  RENAME (progress-bearing rename; MUST reconcile)      : ${worklist.length}`)
  console.log(`  ORPHAN (slug gone, not a tracked rename; investigate) : ${orphan.length}`)
  console.log(`distinct lessons with progress: ${lessProg.length}  (slug gone: ${lessonMissing.length})`)

  if (worklist.length) {
    console.log('\n--- RECONCILIATION WORKLIST (renames that carry real progress) ---')
    for (const w of worklist)
      console.log(
        `  [${w.review ? 'REVIEW' : 'auto  '} conf ${String(w.confidence).padEnd(4)}] ${w.slug}  ->  ${w.newSlug}   (${w.progress_rows} rows / ${w.users} users)  newSlugInContent=${w.newSlugInContent}`,
      )
  }
  if (orphan.length) {
    console.log('\n--- ORPHANS (slug not in content and not in rename map) ---')
    for (const o of orphan) console.log(`  ${o.slug}  "${o.title}"  (${o.progress_rows} rows / ${o.users} users)`)
  }
  if (lessonMissing.length) {
    console.log('\n--- LESSONS with progress whose slug is gone ---')
    for (const l of lessonMissing) console.log(`  ${l.slug}  "${l.title}"  (${l.progress_rows} rows / ${l.users} users)`)
  }

  // ---------- 8. machine-readable (paste this back) ----------
  console.log('\n================ JSON (paste this block back) ================')
  console.log(
    JSON.stringify(
      {
        scale,
        counts: {
          problemsWithProgress: probProg.length,
          safe: safe.length,
          rename: worklist.length,
          orphan: orphan.length,
          lessonsWithProgress: lessProg.length,
          lessonMissing: lessonMissing.length,
        },
        worklist,
        orphan,
        lessonMissing,
      },
      null,
      2,
    ),
  )
  console.log('================ END ================\n')
}

main()
  .catch((e) => {
    console.error('ERROR:', (e as Error)?.message || e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
