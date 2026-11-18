/**
 * Records every turn-stack program from a real Node run under the inspector
 * (`engines/turn-stack/truth/record.ts`) into
 * `engines/turn-stack/recordings/<lesson>.json`, from which the steps are
 * built. Run `yarn viz:hull` after changing a program or a probe;
 * `turn-stack.truth.test.ts` fails until the committed recording matches a
 * fresh run.
 *
 * The programs are a premium practice answer, read from the local content
 * checkout (`src/content`) and checked against their committed sha256s; a
 * lesson whose blocks are absent is skipped, its recording left as it is.
 * `--print` only prints each program's sha256 and output (authoring).
 */
import fs from 'fs'
import path from 'path'
import { HULL_PROGRAMS } from '../components/visualizations/engines/turn-stack/programs'
import { recordHull, runPlain } from '../components/visualizations/engines/turn-stack/truth/record'
import { loadProgram, skipNote } from '../components/visualizations/step-log/lesson-block'
import { sha256 } from '../components/visualizations/step-log/truth'

const DIR = path.join('src', 'components', 'visualizations', 'engines', 'turn-stack', 'recordings')
const PRINT = process.argv.includes('--print')

lessons: for (const [lesson, programs] of Object.entries(HULL_PROGRAMS)) {
  const out: Record<string, unknown> = {}
  for (const p of programs) {
    const loaded = loadProgram(p.source)
    if (!loaded.ok) {
      console.warn(`${lesson}: skipped, ${skipNote(loaded.missing)}`)
      continue lessons
    }
    const plain = runPlain(p, loaded.text)
    if (PRINT) {
      console.log(`${p.id}: sha256 ${sha256(loaded.text)} prints ${JSON.stringify(plain)}`)
      continue
    }
    if (sha256(loaded.text) !== p.sha256) throw new Error(`${lesson}/${p.id}: the program as run is sha256 ${sha256(loaded.text)}, not ${p.sha256}`)
    const { runtime, ...rec } = recordHull(p, loaded.text)
    for (const [what, got] of [
      ['plain', plain],
      ['inspected', rec.stdout],
    ] as const)
      if (JSON.stringify(got) !== JSON.stringify(p.observed))
        throw new Error(`${lesson}/${p.id}: the ${what} run printed ${JSON.stringify(got)}, the program declares ${JSON.stringify(p.observed)}`)
    out[p.id] = rec
    console.log(`${lesson}/${p.id}: ${rec.pauses.length} pause(s) on ${runtime}`)
  }
  if (!PRINT) fs.writeFileSync(path.join(DIR, `${lesson}.json`), `${JSON.stringify(out, null, 1)}\n`)
}
