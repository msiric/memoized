/**
 * Records the pointer states of every linked-list lesson program from a
 * real Node run (`engines/linked-list/truth/record.ts`) into
 * `engines/linked-list/recordings/<lesson>.json`, from which the steps and
 * frames are built. Run `yarn viz:linked-list` after changing a program or
 * a probe; `linked-list.truth.test.ts` fails until the committed recording
 * matches a fresh run.
 */
import fs from 'fs'
import path from 'path'
import { POINTER_PROGRAMS } from '../components/visualizations/engines/linked-list/programs'
import { recordPointers, runPlain } from '../components/visualizations/engines/linked-list/truth/record'

const DIR = path.join('src', 'components', 'visualizations', 'engines', 'linked-list', 'recordings')

for (const [lesson, programs] of Object.entries(POINTER_PROGRAMS)) {
  const out: Record<string, unknown> = {}
  for (const p of programs) {
    const { runtime, ...rec } = recordPointers(p)
    const plain = runPlain(p)
    for (const [what, got] of [['plain', plain], ['instrumented', rec.observed]] as const)
      if (JSON.stringify(got) !== JSON.stringify(p.observed))
        throw new Error(`${lesson}/${p.id}: the ${what} run printed ${JSON.stringify(got)}, the program declares ${JSON.stringify(p.observed)}`)
    out[p.id] = rec
    console.log(`${lesson}/${p.id}: ${rec.hits.length} probe hit(s) on ${runtime}`)
  }
  fs.writeFileSync(path.join(DIR, `${lesson}.json`), `${JSON.stringify(out, null, 1)}\n`)
}
