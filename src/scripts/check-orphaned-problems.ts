/**
 * Guardrail against the silent orphan/duplicate problem the slug-keyed content
 * sync can cause: if a problem's title (and therefore its slug) changed since
 * the last sync, `sync-content.ts` creates a NEW row and leaves the OLD row —
 * with every user's ProblemProgress — orphaned and shown as a duplicate.
 *
 * This script compares the Problem slugs currently in the database against the
 * slugs the current content would produce. Any DB slug NOT present in the
 * content is an "orphan-to-be" (a rename/removal). Run it BEFORE the sync as a
 * pre-flight: if it exits non-zero the sync is blocked until the operator either
 * reconciles renames (migrate-renamed-problems.ts) or confirms the removals are
 * intentional (--allow <n>). Nothing here deletes or mutates data.
 *
 * Usage:
 *   tsx src/scripts/check-orphaned-problems.ts [--content <dir>] [--allow <maxOrphans>]
 */
import { CONTENT_FOLDER, SLUGIFY_OPTIONS } from '@/constants'
import prisma from '@/lib/prisma'
import { glob } from 'glob'
import fs from 'fs'
import path from 'path'
import slugify from 'slugify'

slugify.extend({ '/': '-' })
const slug = (t: string) => slugify(t, SLUGIFY_OPTIONS)

function arg(name: string, def?: string) {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : def
}

async function main() {
  const contentDir = arg('content', path.join('src', CONTENT_FOLDER))!
  const allow = parseInt(arg('allow', '0')!, 10)

  const files = await glob(`${contentDir}/**/_lessons.json`)
  if (files.length === 0) {
    console.error(`No _lessons.json under ${contentDir}; nothing to check.`)
    process.exit(1)
  }

  const contentSlugs = new Set<string>()
  for (const f of files) {
    const d = JSON.parse(fs.readFileSync(f, 'utf8'))
    for (const l of d.lessons) for (const p of (l.problems || [])) contentSlugs.add(slug(p.title))
  }

  const dbProblems = await prisma.problem.findMany({ select: { slug: true, title: true } })
  const orphans = dbProblems.filter((p) => !contentSlugs.has(p.slug))

  console.log(`content problems: ${contentSlugs.size} | db problems: ${dbProblems.length} | orphans-to-be: ${orphans.length}`)

  if (orphans.length > allow) {
    console.error(`\n❌ ${orphans.length} DB problems have no matching slug in the current content.`)
    console.error(`   Syncing now would ORPHAN these rows (stranding user progress) and create duplicates.\n`)
    orphans.slice(0, 40).forEach((o) => console.error(`   - ${o.slug}   ("${o.title}")`))
    if (orphans.length > 40) console.error(`   … and ${orphans.length - 40} more`)
    console.error(`\n   Fix by (a) reconciling renames: tsx src/scripts/migrate-renamed-problems.ts --apply`)
    console.error(`   or (b) if these removals are intentional, re-run with --allow ${orphans.length}.`)
    process.exit(1)
  }

  console.log('✅ No unexpected orphans. Safe to sync.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
