/**
 * Records every dp-table program from a real Node run under the inspector
 * (`engines/dp-table/truth/record.ts`) into
 * `engines/dp-table/recordings/<lesson>.json`, from which the steps are
 * built. Run `yarn viz:dp` after changing a program or a probe;
 * `dp-table.truth.test.ts` fails until the committed recording matches a
 * fresh run.
 *
 * The programs are a premium practice answer, read from the local content
 * checkout (`src/content`) and checked against their committed sha256s; a
 * lesson whose blocks are absent is skipped, its recording left as it is.
 */
import fs from 'fs'
import path from 'path'
import { DP_PROGRAMS } from '../components/visualizations/engines/dp-table/programs'
import { recordDp, runPlain } from '../components/visualizations/engines/dp-table/truth/record'
import { loadProgram, skipNote } from '../components/visualizations/step-log/lesson-block'
import { sha256 } from '../components/visualizations/step-log/truth'

const DIR = path.join('src', 'components', 'visualizations', 'engines', 'dp-table', 'recordings')

lessons: for (const [lesson, programs] of Object.entries(DP_PROGRAMS)) {
  const out: Record<string, unknown> = {}
  for (const p of programs) {
    const loaded = loadProgram(p.source)
    if (!loaded.ok) {
      console.warn(`${lesson}: skipped, ${skipNote(loaded.missing)}`)
      continue lessons
    }
    if (sha256(loaded.text) !== p.sha256) throw new Error(`${lesson}/${p.id}: the program as run is sha256 ${sha256(loaded.text)}, not ${p.sha256}`)
    const { runtime, ...rec } = recordDp(p, loaded.text)
    const plain = runPlain(p, loaded.text)
    for (const [what, got] of [
      ['plain', plain],
      ['inspected', rec.stdout],
    ] as const)
      if (JSON.stringify(got) !== JSON.stringify(p.observed))
        throw new Error(`${lesson}/${p.id}: the ${what} run printed ${JSON.stringify(got)}, the program declares ${JSON.stringify(p.observed)}`)
    out[p.id] = rec
    console.log(`${lesson}/${p.id}: ${rec.pauses.length} pause(s) on ${runtime}`)
  }
  fs.writeFileSync(path.join(DIR, `${lesson}.json`), `${JSON.stringify(out, null, 1)}\n`)
}
