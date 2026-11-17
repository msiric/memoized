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
import { CLASS_PROGRAMS, PROTOTYPE_PROGRAMS } from '../components/visualizations/engines/heap-graph/proto-programs'
import { loadProgram, skipNote } from '../components/visualizations/step-log/lesson-block'

const DIR = path.join('src', 'components', 'visualizations', 'engines', 'heap-graph', 'recordings')
// prototypes.json: the Prototypes lesson; classes.json: Objects and Classes (wave 4C).
for (const [name, programs] of [['prototypes', PROTOTYPE_PROGRAMS], ['classes', CLASS_PROGRAMS]] as const) {
  const out: Record<string, unknown> = {}
  let skipped = false
  for (const p of programs) {
    const loaded = loadProgram(p.source)
    if (!loaded.ok) {
      console.warn(`${name}: skipped, ${skipNote(loaded.missing)}`)
      skipped = true
      break
    }
    const { runtime, ...rec } = recordTree(p, loaded.text)
    out[p.id] = rec
    console.log(`${p.id}: printed ${JSON.stringify(rec.stdout)} on ${runtime}`)
  }
  if (!skipped) fs.writeFileSync(path.join(DIR, `${name}.json`), `${JSON.stringify(out, null, 1)}\n`)
}
