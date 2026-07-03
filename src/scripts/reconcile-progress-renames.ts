/**
 * One-time, progress-preserving reconciliation for the Dec-2024 → now content gap.
 *
 * During the canonical/TCV rewrite, 322 JS-track problems changed title (→ slug).
 * Only 33 of them carry real user progress in production (see
 * inventory-prod-progress.ts). This script aligns those prod rows to the current
 * content so the stable-id sync updates each row IN PLACE — preserving every
 * UserProblemProgress row — instead of creating a duplicate and stranding progress.
 *
 * It uses the HUMAN-VERIFIED prisma/progress-rename-map.json (each entry checked by
 * comparing the old question against the current content). It does NOT use the
 * position-aligned problem-rename-map.json, which mis-pairs restructured lessons.
 *
 * Mechanism (per entry):
 *   - rename / move: set the prod row's slug to the new slug. The sync then finds
 *     it by slug, updates it in place (title, lessonId for moves) and sets its
 *     contentId. The row id never changes, so progress FKs survive.
 *   - merge (two old problems → one current): the first existing old row becomes
 *     the survivor (gets the new slug); the other rows' progress is migrated onto
 *     it (dedup on the [userId, problemId] unique) and they are left detached.
 *   - removed: no current equivalent exists → left untouched (progress stays on the
 *     now-deleted problem; crediting an unrelated problem would be mis-attribution).
 *
 * Nothing is deleted. Idempotent (safe to re-run). Dry-run by default.
 *
 * Usage:
 *   tsx src/scripts/reconcile-progress-renames.ts                 # DRY RUN
 *   tsx src/scripts/reconcile-progress-renames.ts --apply
 *   tsx src/scripts/reconcile-progress-renames.ts --map <file>
 */
import prisma from '@/lib/prisma'
import fs from 'fs'
import path from 'path'

type RenameEntry = { oldSlug: string; newSlug: string; kind: string; users: number }
type MergeEntry = { oldSlugs: string[]; newSlug: string }
type RemovedEntry = { oldSlug: string; reason: string }
type ReconcileMap = { renames: RenameEntry[]; merges: MergeEntry[]; removed: RemovedEntry[] }

function arg(name: string, def?: string) {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : def
}

const apply = process.argv.includes('--apply')

const findBySlug = (slug: string) =>
  prisma.problem.findUnique({ where: { slug }, select: { id: true, slug: true, title: true } })

const countProgress = (problemId: string) =>
  prisma.userProblemProgress.count({ where: { problemId } })

/** Move progress rows from one problem to another, respecting the [userId, problemId] unique. */
async function migrateProgress(fromId: string, toId: string) {
  const rows = await prisma.userProblemProgress.findMany({ where: { problemId: fromId } })
  let moved = 0
  let merged = 0
  for (const r of rows) {
    const existing = await prisma.userProblemProgress.findUnique({
      where: { userId_problemId: { userId: r.userId, problemId: toId } },
    })
    if (existing) {
      // survivor already has this user's progress — keep the "completed" one, drop the dup
      if (r.completed && !existing.completed) {
        await prisma.userProblemProgress.update({
          where: { id: existing.id },
          data: { completed: true, completedAt: r.completedAt },
        })
      }
      await prisma.userProblemProgress.delete({ where: { id: r.id } })
      merged++
    } else {
      await prisma.userProblemProgress.update({ where: { id: r.id }, data: { problemId: toId } })
      moved++
    }
  }
  return { moved, merged }
}

async function main() {
  const mapFile = arg('map', path.join('prisma', 'progress-rename-map.json'))!
  const map: ReconcileMap = JSON.parse(fs.readFileSync(mapFile, 'utf8'))

  console.log(`${apply ? '🚀 APPLYING' : '🔎 DRY RUN'} — progress reconciliation from ${mapFile}\n`)
  let reconciled = 0
  let skipped = 0
  let conflicts = 0
  let migratedRows = 0

  // ---- renames / moves ----
  for (const e of map.renames) {
    const src = await findBySlug(e.oldSlug)
    if (!src) { console.log(`  skip (no prod row for old slug): ${e.oldSlug}`); skipped++; continue }
    const dst = await findBySlug(e.newSlug)
    if (dst && dst.id !== src.id) {
      console.log(`  ⚠️ CONFLICT: new slug already on another row — skipping ${e.oldSlug} -> ${e.newSlug}`)
      conflicts++
      continue
    }
    if (dst && dst.id === src.id) { console.log(`  already done: ${e.oldSlug} -> ${e.newSlug}`); continue }
    const prog = await countProgress(src.id)
    console.log(`  ${e.kind}: ${e.oldSlug} -> ${e.newSlug}  (${prog} progress rows preserved on same row id)`)
    if (apply) await prisma.problem.update({ where: { id: src.id }, data: { slug: e.newSlug } })
    reconciled++
  }

  // ---- merges (two old problems → one current problem) ----
  for (const m of map.merges) {
    const present: Array<{ oldSlug: string; id: string }> = []
    for (const os of m.oldSlugs) {
      const r = await findBySlug(os)
      if (r) present.push({ oldSlug: os, id: r.id })
    }
    if (!present.length) { console.log(`  skip merge (no prod rows): ${m.oldSlugs.join(' + ')}`); skipped++; continue }

    // survivor already carrying the target slug? then it's the survivor; else the first present row
    const already = await findBySlug(m.newSlug)
    const survivor = present.find((p) => p.id === already?.id) ?? present[0]
    if (already && already.id !== survivor.id) {
      console.log(`  ⚠️ CONFLICT: merge target ${m.newSlug} on an unexpected row — skipping ${m.oldSlugs.join(' + ')}`)
      conflicts++
      continue
    }
    console.log(`  MERGE: [${m.oldSlugs.join(', ')}] -> ${m.newSlug}  (survivor=${survivor.oldSlug})`)
    if (apply && already?.id !== survivor.id) {
      await prisma.problem.update({ where: { id: survivor.id }, data: { slug: m.newSlug } })
    }
    for (const other of present.filter((p) => p.id !== survivor.id)) {
      const prog = await countProgress(other.id)
      console.log(`     migrate ${prog} progress row(s): ${other.oldSlug} -> ${survivor.oldSlug}`)
      if (apply) {
        const res = await migrateProgress(other.id, survivor.id)
        migratedRows += res.moved + res.merged
      }
    }
    reconciled++
  }

  // ---- removed (leave detached) ----
  for (const r of map.removed) {
    const src = await findBySlug(r.oldSlug)
    const prog = src ? await countProgress(src.id) : 0
    console.log(`  REMOVED (leave detached): ${r.oldSlug}  (${prog} progress row(s) stay on the deleted problem) — ${r.reason}`)
  }

  console.log(
    `\n${apply ? 'reconciled' : 'would reconcile'}: ${reconciled} | skipped: ${skipped} | conflicts: ${conflicts} | migrated progress rows: ${migratedRows}`,
  )
  if (conflicts) console.log('⚠️ Resolve conflicts before running the sync.')
  if (!apply) console.log('\nRe-run with --apply to execute (snapshot/branch the DB first — Neon PITR).')
}

main()
  .catch((e) => { console.error('ERROR:', (e as Error)?.message || e); process.exit(1) })
  .finally(() => prisma.$disconnect())
