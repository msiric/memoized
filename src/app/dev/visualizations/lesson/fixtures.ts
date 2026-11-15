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
 * Placements match the content repo's placement branch
 * (`feat/viz-placement-flagships`): a visual that asks for a prediction sits
 * before any prose that states its answer; a static figure sits after the
 * example it explains.
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
/** The corrected wording (`fix/batch-2d-wording`), the source of the heap-graph lessons. */
export const BATCH_2D_COMMIT = '273a7717d6f1f5d32ad8d8c474ce737b7d451215'
/**
 * The wave 1B lessons: their corrected bodies are on the content repo's
 * `fix/batch-2d-wording` branch (not yet on master), so their copies come
 * from it.
 */
export const CONTENT_COMMIT_1B = '273a7717d6f1f5d32ad8d8c474ce737b7d451215'

export const LESSON_FIXTURES: LessonFixture[] = [
  {
    slug: 'event-loop',
    title: 'Event Loop',
    section: { title: 'Core Fundamentals', href: '/courses/js-track/core-fundamentals' },
    source: 'content/js-track/core-fundamentals/event-loop/page.mdx',
    commit: CONTENT_COMMIT,
    file: 'fixtures/event-loop.mdx',
    // Before Practical Examples: Example 1 is the visual's program with its
    // output printed, so the prediction comes first (content PR placement).
    inserts: [{ before: '## **Practical Examples**', viz: '<Viz id="event-loop" />' }],
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
    slug: 'data-types',
    title: 'Data Types',
    section: { title: 'Core Fundamentals', href: '/courses/js-track/core-fundamentals' },
    source: 'content/js-track/core-fundamentals/data-types/page.mdx',
    commit: BATCH_2D_COMMIT,
    file: 'fixtures/data-types.mdx',
    // After the third identity example (spread shares stats) and its
    // paragraph, closing "Records and property presence": the figure draws
    // all three examples, so it follows the last one it explains.
    inserts: [{ before: '<h2 id="arrays">Array operations for this task</h2>', viz: '<Viz id="heap-graph" preset="identity-alias-rebind-spread" />' }],
  },
  {
    slug: 'objects',
    title: 'JavaScript Objects',
    section: { title: 'Built-in Data Structures', href: '/courses/dsa-track/built-in-data-structures' },
    source: 'content/dsa-track/built-in-data-structures/objects/page.mdx',
    commit: BATCH_2D_COMMIT,
    file: 'fixtures/objects.mdx',
    // After Deep Cloning, the last of the three examples it draws (the
    // shallow-copy gotcha and the nested update come earlier).
    inserts: [{ before: '### **Merging Objects Recursively**', viz: '<Viz id="heap-graph" preset="spread-vs-nested-vs-deep" />' }],
  },
  {
    slug: 'scope-chain',
    title: 'Scope Chain',
    section: { title: 'Core Fundamentals', href: '/courses/js-track/core-fundamentals' },
    source: 'content/js-track/core-fundamentals/scope-chain/page.mdx',
    commit: CONTENT_COMMIT_1B,
    file: 'fixtures/scope-chain.mdx',
    inserts: [
      // After "The Caller Is Not the Lexical Parent" (its code and its answer).
      {
        before: '### **Identifiers Are Not Properties**',
        viz: '<Viz id="environment-records" preset="caller-is-not-lexical-parent" />',
      },
      // After Exercise 4's answer, so the figure never answers the exercise.
      { before: '### **Exercise 5: Function Scope and Closure**', viz: '<Viz id="environment-records" preset="tdz-stops-lookup" />' },
    ],
  },
  {
    slug: 'promise-patterns',
    title: 'Promise Patterns',
    section: { title: 'Advanced Concepts', href: '/courses/js-track/advanced-concepts' },
    source: 'content/js-track/advanced-concepts/promise-patterns/page.mdx',
    // Premium: local checkout only. The lesson body has no microtask-order
    // snippet yet (it is in a practice answer): the content PR adds a short
    // section after Chaining Promises; the visual opens it, before any prose
    // that states the order.
    inserts: [{ before: '## **Promise.all and Promise.race**', viz: '<Viz id="event-loop" preset="microtask-vs-timer-12345" />' }],
  },
  {
    slug: 'virtual-dom',
    title: 'Virtual DOM',
    section: { title: 'Frontend Development', href: '/courses/js-track/frontend-development' },
    source: 'content/js-track/frontend-development/virtual-dom/page.mdx',
    // Premium: local checkout only. After Example 3 (keys in lists).
    inserts: [{ before: '## **Best Practices**', viz: '<Viz id="list-keys" />' }],
  },
  // Wave 2A, the frontier (all three lessons PREMIUM: local checkout only,
  // from `fix/batch-2d-wording` at 273a771).
  {
    slug: 'graph-bfs',
    title: 'Graph BFS',
    section: { title: 'Common Techniques', href: '/courses/dsa-track/common-techniques' },
    source: 'content/dsa-track/common-techniques/graph-bfs/page.mdx',
    // After the shortest-path example it steps through (its output names no
    // vertex that sets F's distance), before the section's tips.
    inserts: [{ before: '### **Tips and Tricks:**', viz: '<Viz id="bfs-dfs-frontier" preset="bfs-levels" />' }],
  },
  {
    slug: 'shortest-path-algorithms',
    title: 'Shortest Path Algorithms',
    section: { title: 'Advanced Topics', href: '/courses/dsa-track/advanced-topics' },
    source: 'content/dsa-track/advanced-topics/shortest-path-algorithms/page.mdx',
    // Before Dijkstra's steps and example: the example's output comment
    // ([ 0, 8, 6, 5, 3 ]) would answer the question about dist[1].
    inserts: [{ before: '**Steps:**', viz: '<Viz id="bfs-dfs-frontier" preset="dijkstra-lazy-heap" />' }],
  },
  {
    slug: 'trees',
    title: 'Trees',
    section: { title: 'User-Defined Data Structures', href: '/courses/dsa-track/user-defined-data-structures' },
    source: 'content/dsa-track/user-defined-data-structures/trees/page.mdx',
    // After the Lowest Common Ancestor example, which builds the BST the
    // iterator walks.
    inserts: [{ before: '### **Serialize and Deserialize a Binary Tree**', viz: '<Viz id="bfs-dfs-frontier" preset="bst-iterator-stack" />' }],
  },
  {
    // Not a content-repo copy: an original, non-premium stand-in body with
    // representative prose, code blocks and notes, so list keys has a
    // committed lesson context (R2 G-02). It has no content commit.
    slug: 'list-keys',
    title: 'List Keys (fixture)',
    section: { title: 'Frontend Development', href: '/courses/js-track/frontend-development' },
    source: 'fixtures/list-keys.mdx',
    file: 'fixtures/list-keys.mdx',
    inserts: [{ before: '## **Choosing a Key**', viz: '<Viz id="list-keys" />' }],
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
