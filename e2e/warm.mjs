// Waits for a dev server and compiles every gate route once, so the first
// test does not pay the on-demand compile. Usage: node e2e/warm.mjs <base-url>
const base = process.argv[2] ?? 'http://127.0.0.1:3100'
const routes = [
  '/dev/visualizations',
  '/dev/visualizations?static=1',
  '/dev/visualizations/system',
  '/dev/visualizations/stress',
  '/dev/visualizations/lesson/event-loop',
  '/dev/visualizations/lesson/closures',
  '/dev/visualizations/lesson/scope-chain',
  // The promise-patterns presets (their own lesson group).
  '/dev/visualizations?preset=microtask-vs-timer-12345',
  '/dev/visualizations?preset=await-null',
  '/dev/visualizations/lesson/list-keys',
  '/dev/visualizations/lesson/data-types',
  '/dev/visualizations/lesson/objects',
  '/dev/visualizations?lk=parent-type-change',
  // The frontier step-through (wave 2A), one page per lesson group.
  '/dev/visualizations?fr=bfs-levels',
  '/dev/visualizations?fr=dijkstra-lazy-heap',
  '/dev/visualizations?fr=bst-iterator-stack',
  // Wave 4B: Graph DFS and Topological Sort (the second is local-only).
  '/dev/visualizations?fr=dfs-directed-recstack',
  '/dev/visualizations?fr=kahn-indegree',
  // Pointer rewiring (wave 2B).
  '/dev/visualizations?ll=reverse-between-m2-n4',
  '/dev/visualizations?ll=palindrome-split-reverse-compare',
  '/dev/visualizations?ll=static',
  // The sliding window (wave 2C), one page per lesson group.
  '/dev/visualizations?sw=araaci-k2',
  '/dev/visualizations?sw=set-shrink-longest-substring',
  // The dp table (wave 3A), one lesson group.
  '/dev/visualizations?dp=knapsack-1d-desc-vs-asc',
  // The convex-hull turn stack (wave 4E), one lesson group.
  '/dev/visualizations?ch=monotone-chain-turn-pops',
  // Streaming SSR (wave 4E), one lesson group.
  '/dev/visualizations?ssr=two-boundary-stream',
  // The service-worker lifecycle (wave 4E), one lesson group.
  '/dev/visualizations?swl=update-and-reload',
  // The frames step-throughs (wave 3C), one page per visual.
  '/dev/visualizations?fx=twoWay-next-arg',
  '/dev/visualizations?fx=refill-on-settle',
  '/dev/visualizations?fx=once-consumed-by-nested-emit',
  // The wave 4C event-loop groups (Exercise 2; the call-stack traces, local-only) and core figures.
  '/dev/visualizations?el=exercise-2-async1-async2',
  '/dev/visualizations?el=who-called-inner',
  '/dev/visualizations?core=static',
  // The annotated trees (wave 2D).
  '/dev/visualizations?at=static',
  // The wave 3B JavaScript-track figures (static).
  '/dev/visualizations?js=static',
  // The wave 4A DSA-track figures (static).
  '/dev/visualizations?dsa=static',
]
const deadline = Date.now() + 300_000
for (const route of routes) {
  for (;;) {
    try {
      const res = await fetch(base + route)
      if (res.ok) {
        console.log(`ready ${route}`)
        break
      }
      console.log(`${res.status} ${route}`)
    } catch {
      /* not up yet */
    }
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${base}${route}`)
    await new Promise((r) => setTimeout(r, 2000))
  }
}
