/**
 * Records the prototype object graph's programs from a real Node run under
 * the inspector (the annotated-tree recorder) into
 * `engines/heap-graph/recordings/prototypes.json`, from which the figures are
 * built. Run `yarn viz:prototypes` after changing a program; the truth test
 * fails until the committed recording matches a fresh run. Each program is
 * read from the local content checkout (`src/content`) and checked against
 * its committed sha256; without the checkout nothing is written.
 */
import fs from 'fs'
import path from 'path'
import { recordTree } from '../components/visualizations/engines/annotated-tree/truth/record'
import { PROTOTYPE_PROGRAMS } from '../components/visualizations/engines/heap-graph/proto-programs'
import { loadProgram, skipNote } from '../components/visualizations/step-log/lesson-block'

const FILE = path.join('src', 'components', 'visualizations', 'engines', 'heap-graph', 'recordings', 'prototypes.json')
const out: Record<string, unknown> = {}
for (const p of PROTOTYPE_PROGRAMS) {
  const loaded = loadProgram(p.source)
  if (!loaded.ok) {
    console.warn(`prototypes: skipped, ${skipNote(loaded.missing)}`)
    process.exit(0)
  }
  const { runtime, ...rec } = recordTree(p, loaded.text)
  out[p.id] = rec
  console.log(`${p.id}: printed ${JSON.stringify(rec.stdout)} on ${runtime}`)
}
fs.writeFileSync(FILE, `${JSON.stringify(out, null, 1)}\n`)
