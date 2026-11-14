/**
 * Records the heap-graph snapshots of every lesson program from a real Node
 * run (`engines/heap-graph/truth/record.ts`) into
 * `engines/heap-graph/recordings/<lesson>.json`, from which the figures are
 * built. Run `yarn viz:heap` after changing a program or a snapshot point;
 * `heap-graph.truth.test.ts` fails until the committed recording matches a
 * fresh run.
 */
import fs from 'fs'
import path from 'path'
import { HEAP_LESSONS } from '../components/visualizations/engines/heap-graph/programs'
import { recordHeap } from '../components/visualizations/engines/heap-graph/truth/record'

const DIR = path.join('src', 'components', 'visualizations', 'engines', 'heap-graph', 'recordings')

for (const [lesson, programs] of Object.entries(HEAP_LESSONS)) {
  const out: Record<string, unknown> = {}
  for (const p of programs) {
    const { runtime, ...rec } = recordHeap(p)
    if (JSON.stringify(rec.observed) !== JSON.stringify(p.observed))
      throw new Error(`${lesson}/${p.id}: the instrumented run printed ${JSON.stringify(rec.observed)}, the program declares ${JSON.stringify(p.observed)}`)
    out[p.id] = rec
    console.log(`${lesson}/${p.id}: ${Object.keys(rec.snapshots).length} snapshot(s) on ${runtime}`)
  }
  fs.writeFileSync(path.join(DIR, `${lesson}.json`), `${JSON.stringify(out, null, 1)}\n`)
}
