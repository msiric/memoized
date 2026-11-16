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
  /** Each visual goes before the first line starting with `before`; an empty `before` puts it at the end of the body. */
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
    // Premium: local checkout only. The content placement branch adds "When
    // Promise Callbacks Run" after Chaining Promises, whose two examples are
    // the presets' programs (lesson examples, never the practice answer); the
    // visual opens it, before any prose that states the order. On a checkout
    // with that section the lesson's own tag places it; otherwise this insert does.
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
    slug: 'linked-list-reversal',
    title: 'Linked List Reversal',
    section: { title: 'Common Techniques', href: '/courses/dsa-track/common-techniques' },
    source: 'content/dsa-track/common-techniques/linked-list-reversal/page.mdx',
    // Premium: local checkout only (wave 2B).
    inserts: [
      // After the full-reversal example (its first Tips and Tricks): the strip of its passes.
      { before: '### **Tips and Tricks:**', viz: '<Viz id="linked-list-frames" preset="full-reversal-strip" />' },
      // After "Reversing a Part of the Linked List" (no prose states the temporary loop).
      { before: '## **Reversing Nodes in k-Sized Groups**', viz: '<Viz id="linked-list-pointer-rewiring" />' },
    ],
  },
  {
    slug: 'linked-lists',
    title: 'Linked Lists',
    section: { title: 'User-Defined Data Structures', href: '/courses/dsa-track/user-defined-data-structures' },
    source: 'content/dsa-track/user-defined-data-structures/linked-lists/page.mdx',
    // Premium: local checkout only. The palindrome answer is a practice
    // question's; the body has no palindrome section yet. After Detecting a
    // Cycle (slow and fast), before Merging.
    inserts: [
      {
        before: '### **Merging Two Sorted Lists**',
        viz: '<Viz id="linked-list-pointer-rewiring" preset="palindrome-split-reverse-compare" />',
      },
    ],
  },
  {
    slug: 'fast-and-slow-pointers',
    title: 'Fast and Slow Pointers',
    section: { title: 'Common Techniques', href: '/courses/dsa-track/common-techniques' },
    source: 'content/dsa-track/common-techniques/fast-and-slow-pointers/page.mdx',
    // Premium: local checkout only. After "Finding the Start of a Cycle" (its
    // example, tips and gotchas): the figure explains why phase 2 works.
    inserts: [{ before: '## **Finding the Middle of a Linked List**', viz: '<Viz id="linked-list-frames" preset="floyd-rho" />' }],
  },
  // Wave 2C, the sliding window (both lessons PREMIUM: local checkout only).
  {
    slug: 'sliding-window',
    title: 'Sliding Window Technique',
    section: { title: 'Common Techniques', href: '/courses/dsa-track/common-techniques' },
    source: 'content/dsa-track/common-techniques/sliding-window/page.mdx',
    // After the variable-size example it steps through, before that
    // section's own Tips and Tricks (two lines: the fixed-size section has
    // its own first). No prose states where windowStart stops or what the
    // `if` version returns.
    inserts: [{ before: '### **Tips and Tricks:**\n- Use a hashmap', viz: '<Viz id="sliding-window" />' }],
  },
  {
    slug: 'strings',
    title: 'JavaScript Strings',
    section: { title: 'Built-in Data Structures', href: '/courses/dsa-track/built-in-data-structures' },
    source: 'content/dsa-track/built-in-data-structures/strings/page.mdx',
    // The window is the practice answer's (longest substring without
    // repeating characters); the body has no window section. At the end of
    // String Algorithms, before the interview tips: no prose discusses it.
    inserts: [{ before: '## **Interview Tips and Tricks**', viz: '<Viz id="sliding-window" preset="set-shrink-longest-substring" />' }],
  },
  // Wave 2D, the annotated trees (all three lessons PREMIUM: local checkout
  // only). Static figures, each after the example it explains.
  {
    slug: 'tree-dfs',
    title: 'Tree DFS',
    section: { title: 'Common Techniques', href: '/courses/dsa-track/common-techniques' },
    source: 'content/dsa-track/common-techniques/tree-dfs/page.mdx',
    // The figure explains the Maximum Path Sum practice answer, which the body
    // has no example of (it teaches the iterative orders only): at the end of
    // the body, after Post-Order Traversal, the order the recursion returns in.
    inserts: [{ before: '', viz: '<Viz id="annotated-tree" preset="max-path-gain-vs-through" />' }],
  },
  {
    slug: 'tries',
    title: 'Tries',
    section: { title: 'User-Defined Data Structures', href: '/courses/dsa-track/user-defined-data-structures' },
    source: 'content/dsa-track/user-defined-data-structures/tries/page.mdx',
    // After Deleting Words, the last of the examples it draws (insert, search,
    // startsWith, delete), before the tips.
    inserts: [{ before: '## **Practical Tips and Tricks**', viz: '<Viz id="annotated-tree" preset="trie-end-markers" />' }],
  },
  {
    slug: 'suffix-arrays-and-suffix-trees',
    title: 'Suffix Arrays and Suffix Trees',
    section: { title: 'Advanced Topics', href: '/courses/dsa-track/advanced-topics' },
    source: 'content/dsa-track/advanced-topics/suffix-arrays-and-suffix-trees/page.mdx',
    // After Longest Repeated Substring, the last of the examples it draws (the
    // SuffixTree, buildSuffixArray, buildLCPArray and its "ana").
    inserts: [{ before: '## **Interview Tips and Tricks**', viz: '<Viz id="annotated-tree" preset="suffix-tree-banana" />' }],
  },
  // Wave 3B, the JavaScript-track figures. Local checkout only: the two free
  // lessons too (the app repo keeps no lesson body under the premium-code
  // policy). Static figures, each after the example it explains.
  {
    slug: 'prototypes',
    title: 'Prototypes and Prototypal Inheritance',
    section: { title: 'Core Fundamentals', href: '/courses/js-track/core-fundamentals' },
    source: 'content/js-track/core-fundamentals/prototypes/page.mdx',
    inserts: [
      // After alice.toString(), the lookup it draws, in place of the ASCII chain above it.
      { before: '## **Inheritance Patterns in JavaScript**', viz: '<Viz id="prototype-object-graph" preset="lookup-and-shadowing" />' },
      // After Exercise 3's answer and explanation, the fix it draws.
      { before: '### **Exercise 4: ES6 Class Inheritance**', viz: '<Viz id="prototype-object-graph" preset="constructor-fix" />' },
    ],
  },
  {
    slug: 'engine-and-runtime',
    title: 'Engine and Runtime',
    section: { title: 'Core Fundamentals', href: '/courses/js-track/core-fundamentals' },
    source: 'content/js-track/core-fundamentals/engine-and-runtime/page.mdx',
    // After Example 1's problem and solution, the two trees it draws.
    inserts: [{ before: '#### **Example 2: Avoiding Deoptimization**', viz: '<Viz id="annotated-tree" preset="hidden-class-transitions" />' }],
  },
  {
    slug: 'advanced-types',
    title: 'Advanced Types',
    section: { title: 'TypeScript Introduction', href: '/courses/js-track/typescript-introduction' },
    source: 'content/js-track/typescript-introduction/advanced-types/page.mdx',
    // After Defining Intersection Types, once both unions and intersections are defined.
    inserts: [{ before: '### **Use Cases for Intersection Types**', viz: '<Viz id="lanes" preset="union-vs-intersection" />' }],
  },
  {
    slug: 'event-handling',
    title: 'Event Handling',
    section: { title: 'Advanced Concepts', href: '/courses/js-track/advanced-concepts' },
    source: 'content/js-track/advanced-concepts/event-handling/page.mdx',
    // In Event Flow in the DOM, after the three phases, where the hotlinked MDN image is.
    inserts: [{ before: '### **Capturing Phase**', viz: '<Viz id="lanes" preset="event-dispatch-path" />' }],
  },
  {
    slug: 'performance-optimization',
    title: 'Performance Optimization',
    section: { title: 'Advanced Concepts', href: '/courses/js-track/advanced-concepts' },
    source: 'content/js-track/advanced-concepts/performance-optimization/page.mdx',
    // After Implementing Throttle, the second of the two functions it runs.
    inserts: [{ before: '### **Use Cases and Examples**', viz: '<Viz id="lanes" preset="debounce-vs-throttle" />' }],
  },
  {
    slug: 'security',
    title: 'Security',
    section: { title: 'Frontend Development', href: '/courses/js-track/frontend-development' },
    source: 'content/js-track/frontend-development/security/page.mdx',
    // The body has no OAuth example (it is in the practice answer): at the end
    // of Secure Authentication Practices, before authorization.
    inserts: [{ before: '## **Secure Authorization Practices**', viz: '<Viz id="lanes" preset="oauth-pkce-channels" />' }],
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
    // A lesson that already places this visual (a content placement branch) keeps its own tag.
    if (mdx.includes(viz)) continue
    if (!before) {
      mdx = `${mdx.trimEnd()}\n\n${viz}\n`
      continue
    }
    // A heading match is anchored at a line start; the first one wins.
    const at = mdx.search(new RegExp(`^${before.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'm'))
    if (at < 0) throw new Error(`${f.slug}: no line starting with "${before}" to place ${viz} before`)
    mdx = `${mdx.slice(0, at)}${viz}\n\n${mdx.slice(at)}`
  }
  return mdx
}
