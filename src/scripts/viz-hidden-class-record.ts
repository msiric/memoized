/**
 * Records the hidden-class programs (engine-and-runtime) from a real Node run
 * with `--allow-natives-syntax` under the inspector
 * (`engines/annotated-tree/truth/record-maps.ts`) into
 * `engines/annotated-tree/recordings/engine-and-runtime.json`. Run `yarn
 * viz:maps` after changing a program; the truth test fails until the
 * committed recording matches a fresh run. Without the content checkout
 * nothing is written.
 */
import fs from 'fs'
import path from 'path'
import { HIDDEN_CLASS_PROGRAMS } from '../components/visualizations/engines/annotated-tree/programs/hidden-classes'
import { recordMaps } from '../components/visualizations/engines/annotated-tree/truth/record-maps'
import { loadProgram, skipNote } from '../components/visualizations/step-log/lesson-block'

const FILE = path.join('src', 'components', 'visualizations', 'engines', 'annotated-tree', 'recordings', 'engine-and-runtime.json')
const out: Record<string, unknown> = {}
for (const p of HIDDEN_CLASS_PROGRAMS) {
  const loaded = loadProgram(p.source)
  if (!loaded.ok) {
    console.warn(`engine-and-runtime: skipped, ${skipNote(loaded.missing)}`)
    process.exit(0)
  }
  const { runtime, ...rec } = recordMaps(p, loaded.text)
  out[p.id] = rec
  console.log(`${p.id}: ${rec.pauses.length} pauses on ${runtime}`)
}
fs.writeFileSync(FILE, `${JSON.stringify(out, null, 1)}\n`)
