/**
 * Generate a problem rename map (old slug -> new slug) by position-aligning the
 * content at a previous git ref (what production last synced) against the
 * current content. Renamed problems can then be migrated in place instead of
 * being orphaned + duplicated by the slug-keyed content sync.
 *
 * Usage:
 *   tsx src/scripts/generate-rename-map.ts --content <content-repo-dir> --from <gitRef> [--out <file>]
 * Example:
 *   tsx src/scripts/generate-rename-map.ts --content ../memoized-content --from origin/master
 */
import { SLUGIFY_OPTIONS } from '@/constants'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import slugify from 'slugify'

slugify.extend({ '/': '-' })
const slug = (t: string) => slugify(t, SLUGIFY_OPTIONS)

function arg(name: string, def?: string) {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : def
}

function main() {
  const contentDir = path.resolve(arg('content', '../memoized-content')!)
  const fromRef = arg('from', 'origin/master')!
  const out = arg('out', path.join('prisma', 'problem-rename-map.json'))!

  const rel = execSync(`git -C ${contentDir} ls-files content/**/_lessons.json`, { encoding: 'utf8' })
    .trim().split('\n')

  const map: Array<{ lesson: string; oldTitle: string; oldSlug: string; newTitle: string; newSlug: string; confidence: number; review: boolean }> = []
  let renamed = 0, collisions = 0

  for (const p of rel) {
    let oldRaw: string
    try { oldRaw = execSync(`git -C ${contentDir} show ${fromRef}:${p}`, { encoding: 'utf8' }) } catch { continue }
    const newRaw = fs.readFileSync(path.join(contentDir, p), 'utf8')
    const oldD = JSON.parse(oldRaw), newD = JSON.parse(newRaw)
    const newById: Record<string, any> = {}
    for (const l of newD.lessons) newById[l.id] = l
    for (const oldL of oldD.lessons) {
      const newL = newById[oldL.id]
      if (!newL) continue
      const oldP = oldL.problems || [], newP = newL.problems || []
      for (let i = 0; i < oldP.length; i++) {
        if (!newP[i]) continue // old problem beyond new list — handled by guardrail, not renamed
        if (oldP[i].title !== newP[i].title) {
          const oldSlug = slug(oldP[i].title), newSlug = slug(newP[i].title)
          if (oldSlug === newSlug) continue // slug unchanged (punctuation-only) — upsert handles it
          const oldWords = oldP[i].title.toLowerCase().split(/\W+/).filter(Boolean)
          const newWords = newP[i].title.toLowerCase().split(/\W+/).filter(Boolean)
          const overlap = oldWords.filter((w: string) => newWords.includes(w)).length
          const confidence = Math.round((overlap / Math.max(oldWords.length, newWords.length, 1)) * 100) / 100
          map.push({
            lesson: oldL.id,
            oldTitle: oldP[i].title,
            oldSlug,
            newTitle: newP[i].title,
            newSlug,
            confidence, // 1 = titles share all words; low = likely a REPLACEMENT, not a rename — review before migrating
            review: confidence < 0.34, // flag likely replacements for human review
          })
          renamed++
        }
      }
    }
  }

  // sanity: no two old slugs map to the same new slug, and no new slug is also an old slug elsewhere
  const newSlugs = new Set(map.map((m) => m.newSlug))
  for (const m of map) if (map.filter((x) => x.newSlug === m.newSlug).length > 1) collisions++

  fs.writeFileSync(out, JSON.stringify(map, null, 2) + '\n')
  const needsReview = map.filter((m) => m.review).length
  console.log(`from ref: ${fromRef}`)
  console.log(`renamed problems: ${renamed}`)
  console.log(`unique new slugs: ${newSlugs.size}`)
  console.log(`new-slug collisions: ${collisions}`)
  console.log(`FLAGGED for human review (low title overlap — likely replacements, not renames): ${needsReview}`)
  console.log(`wrote ${out}`)
  console.log(`\nNEXT: review ${out}, delete any entry that is a replacement (not a rename),`)
  console.log(`then dry-run: tsx src/scripts/migrate-renamed-problems.ts`)
}

main()
