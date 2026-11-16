/**
 * Records every annotated-tree program from a real Node run under the
 * inspector (`engines/annotated-tree/truth/record.ts`) into
 * `engines/annotated-tree/recordings/<lesson>.json`, from which the static
 * figures are built. Run `yarn viz:tree` after changing a program or its
 * probes; `annotated-tree.truth.test.ts` fails until the committed
 * recording matches a fresh run.
 *
 * Each program's code is a premium lesson block, read from the local
 * content checkout (`src/content`) and checked against its committed
 * sha256; a lesson whose block is absent is skipped, never guessed.
 */
import fs from 'fs'
import path from 'path'
import { TREE_LESSONS } from '../components/visualizations/engines/annotated-tree/programs'
import { recordTree } from '../components/visualizations/engines/annotated-tree/truth/record'
import { loadProgram, skipNote } from '../components/visualizations/step-log/lesson-block'

const DIR = path.join('src', 'components', 'visualizations', 'engines', 'annotated-tree', 'recordings')

lessons: for (const [lesson, programs] of Object.entries(TREE_LESSONS)) {
  const out: Record<string, unknown> = {}
  for (const p of programs) {
    const loaded = loadProgram(p.source)
    if (!loaded.ok) {
      console.warn(`${lesson}: skipped, ${skipNote(loaded.missing)}`)
      continue lessons
    }
    const { runtime, ...rec } = recordTree(p, loaded.text)
    out[p.id] = rec
    console.log(`${p.id}: ${rec.pauses.length} pauses, printed ${JSON.stringify(rec.stdout)} on ${runtime}`)
  }
  fs.writeFileSync(path.join(DIR, `${lesson}.json`), `${JSON.stringify(out, null, 1)}\n`)
}
