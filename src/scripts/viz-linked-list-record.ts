/**
 * Records the pointer states of every linked-list lesson program from a
 * real Node run (`engines/linked-list/truth/record.ts`) into
 * `engines/linked-list/recordings/<lesson>.json`, from which the steps and
 * frames are built. Run `yarn viz:linked-list` after changing a program or
 * a probe; `linked-list.truth.test.ts` fails until the committed recording
 * matches a fresh run.
 *
 * The programs are premium lesson code, read from the local content
 * checkout (`src/content`) and checked against their committed sha256s; a
 * lesson whose blocks are absent is skipped, its recording left as it is.
 */
import fs from 'fs'
import path from 'path'
import { POINTER_PROGRAMS } from '../components/visualizations/engines/linked-list/programs'
import { recordPointers, runPlain } from '../components/visualizations/engines/linked-list/truth/record'
import { loadProgram, skipNote } from '../components/visualizations/step-log/lesson-block'

const DIR = path.join('src', 'components', 'visualizations', 'engines', 'linked-list', 'recordings')

lessons: for (const [lesson, programs] of Object.entries(POINTER_PROGRAMS)) {
  const out: Record<string, unknown> = {}
  for (const p of programs) {
    const loaded = loadProgram(p.source)
    if (!loaded.ok) {
      console.warn(`${lesson}: skipped, ${skipNote(loaded.missing)}`)
      continue lessons
    }
    const { runtime, ...rec } = recordPointers(p, loaded.text)
    const plain = runPlain(p, loaded.text)
    for (const [what, got] of [['plain', plain], ['instrumented', rec.observed]] as const)
      if (JSON.stringify(got) !== JSON.stringify(p.observed))
        throw new Error(`${lesson}/${p.id}: the ${what} run printed ${JSON.stringify(got)}, the program declares ${JSON.stringify(p.observed)}`)
    out[p.id] = rec
    console.log(`${lesson}/${p.id}: ${rec.hits.length} probe hit(s) on ${runtime}`)
  }
  fs.writeFileSync(path.join(DIR, `${lesson}.json`), `${JSON.stringify(out, null, 1)}\n`)
}
