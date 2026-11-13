import fs from 'node:fs'
import path from 'node:path'

/**
 * Lesson-context fixtures (VIZ-H G): real lesson bodies, so the visuals are
 * judged where a reader meets them, between the lesson's own prose, code
 * blocks and notes. The `.mdx` files are byte-identical copies of the
 * content repo (read-only: `git show origin/master:<source>` at `commit`);
 * the `<Viz>` tags are inserted here, at render time, before the named
 * heading, so a refresh is a plain copy. Only FREE lessons are committed
 * (the app repo is public). A premium lesson (list keys) renders only from a
 * local content checkout (`src/content`, the gitignored sync folder), never
 * in CI or the snapshots.
 *
 * Placements follow the VIZ-01 visual table (audit repo,
 * `VIZ/2026-11-11-plan/visual-table.md`): the lessons do not embed the
 * visuals yet, so these are the proposed spots, beside the example each
 * visual illustrates.
 */

export type LessonFixture = {
  slug: string
  title: string
  section: { title: string; href: string }
  /** Path in the content repo (and, for `local`, under `src/content`). */
  source: string
  /** Content repo commit the committed copy was taken from. */
  commit?: string
  /** Committed copy, relative to this folder; absent for a local-only (premium) lesson. */
  file?: string
  inserts: { before: string; viz: string }[]
}

export const CONTENT_COMMIT = '189e8b4a27f92ccc32646bb52fe95565f16d4140'

export const LESSON_FIXTURES: LessonFixture[] = [
  {
    slug: 'event-loop',
    title: 'Event Loop',
    section: { title: 'Core Fundamentals', href: '/courses/js-track/core-fundamentals' },
    source: 'content/js-track/core-fundamentals/event-loop/page.mdx',
    commit: CONTENT_COMMIT,
    file: 'fixtures/event-loop.mdx',
    // Beside Example 1 (setTimeout vs. Promise): the same ordering question.
    inserts: [{ before: '### **Example 2: Multiple Promises**', viz: '<Viz id="event-loop" />' }],
  },
  {
    slug: 'closures',
    title: 'Closures',
    section: { title: 'Core Fundamentals', href: '/courses/js-track/core-fundamentals' },
    source: 'content/js-track/core-fundamentals/closures/page.mdx',
    commit: CONTENT_COMMIT,
    file: 'fixtures/closures.mdx',
    inserts: [
      // After Example 1 (independent counters): factory calls vs aliases.
      {
        before: '### **Example 2: Save Functions, Then Call Them**',
        viz: '<Viz id="environment-records" preset="factory-calls-vs-aliases" />',
      },
      // After Example 2 (the saved-function loop): var vs let.
      { before: '### **Example 3: Methods Sharing a Result**', viz: '<Viz id="environment-records" preset="var-vs-let-loop" />' },
    ],
  },
  {
    slug: 'virtual-dom',
    title: 'Virtual DOM',
    section: { title: 'Frontend Development', href: '/courses/js-track/frontend-development' },
    source: 'content/js-track/frontend-development/virtual-dom/page.mdx',
    // Premium: local checkout only. After Example 3 (keys in lists).
    inserts: [{ before: '## **Best Practices**', viz: '<Viz id="list-keys" />' }],
  },
]

const HERE = path.join(process.cwd(), 'src', 'app', 'dev', 'visualizations', 'lesson')
const LOCAL_CONTENT = path.join(process.cwd(), 'src', 'content')

/** The fixture's MDX with its visuals inserted, or null when the source is not available. */
export function lessonSource(f: LessonFixture): string | null {
  const file = f.file
    ? path.join(HERE, f.file)
    : path.join(LOCAL_CONTENT, f.source.replace(/^content\//, ''))
  if (!fs.existsSync(file)) return null
  let mdx = fs.readFileSync(file, 'utf8')
  for (const { before, viz } of f.inserts) {
    // A heading match is anchored at a line start; the first one wins.
    const at = mdx.search(new RegExp(`^${before.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'm'))
    if (at < 0) throw new Error(`${f.slug}: no line starting with "${before}" to place ${viz} before`)
    mdx = `${mdx.slice(0, at)}${viz}\n\n${mdx.slice(at)}`
  }
  return mdx
}
