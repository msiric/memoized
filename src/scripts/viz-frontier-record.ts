/**
 * Records every frontier program from a real Node run under the inspector
 * (`engines/frontier/truth/record.ts`) into
 * `engines/frontier/recordings/<program>.json`, from which the
 * step-throughs are built. Run `yarn viz:frontier` after changing a program
 * or its probes; `frontier.truth.test.ts` fails until the committed
 * recording matches a fresh run.
 *
 * Each program's code is a premium lesson block, read from the local
 * content checkout (`src/content`) and checked against its committed
 * sha256; a program whose block is absent is skipped, never guessed.
 */
import fs from 'fs'
import path from 'path'
import { FRONTIER_PROGRAMS } from '../components/visualizations/engines/frontier/programs'
import { recordFrontier } from '../components/visualizations/engines/frontier/truth/record'
import { loadProgram, skipNote } from '../components/visualizations/step-log/lesson-block'

const DIR = path.join('src', 'components', 'visualizations', 'engines', 'frontier', 'recordings')

for (const p of FRONTIER_PROGRAMS) {
  const loaded = loadProgram(p.source)
  if (!loaded.ok) {
    console.warn(`${p.id}: skipped, ${skipNote(loaded.missing)}`)
    continue
  }
  const { runtime, ...rec } = recordFrontier(p, loaded.text)
  fs.writeFileSync(path.join(DIR, `${p.id}.json`), `${JSON.stringify(rec, null, 1)}\n`)
  console.log(`${p.id}: ${rec.pauses.length} pauses, printed ${JSON.stringify(rec.stdout)} on ${runtime}`)
}
