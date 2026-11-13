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
