/**
 * Records every frames program from a real Node run under the inspector
 * (`engines/frames/truth/record.ts`) into
 * `engines/frames/recordings/<lesson>.json`, from which the steps are built.
 * Run `yarn viz:frames` after changing a program or a probe;
 * `frames.truth.test.ts` fails until the committed recording matches a fresh
 * run.
 *
 * The programs are premium text (practice answers and a question's visible
 * checks), read from the local content checkout (`src/content`) and checked
 * against their committed sha256s; a lesson whose blocks are absent is
 * skipped, its recording left as it is.
 */
import fs from 'fs'
import path from 'path'
import { FRAMES_PROGRAMS } from '../components/visualizations/engines/frames/programs'
import { recordFrames, runPlain } from '../components/visualizations/engines/frames/truth/record'
import { loadProgram, skipNote } from '../components/visualizations/step-log/lesson-block'
import { sha256 } from '../components/visualizations/step-log/truth'

const DIR = path.join('src', 'components', 'visualizations', 'engines', 'frames', 'recordings')

lessons: for (const [lesson, programs] of Object.entries(FRAMES_PROGRAMS)) {
  const out: Record<string, unknown> = {}
  for (const p of programs) {
    const loaded = loadProgram(p.source)
    if (!loaded.ok) {
      console.warn(`${lesson}: skipped, ${skipNote(loaded.missing)}`)
      continue lessons
    }
    if (sha256(loaded.text) !== p.sha256) throw new Error(`${lesson}/${p.id}: the program as run is sha256 ${sha256(loaded.text)}, not ${p.sha256}`)
    const { runtime, ...rec } = recordFrames(p, loaded.text)
    const plain = runPlain(p, loaded.text)
    for (const [what, got] of [['plain', plain], ['inspected', rec.observed]] as const)
      if (JSON.stringify(got) !== JSON.stringify(p.observed))
        throw new Error(`${lesson}/${p.id}: the ${what} run printed ${JSON.stringify(got)}, the program declares ${JSON.stringify(p.observed)}`)
    out[p.id] = rec
    console.log(`${lesson}/${p.id}: ${rec.pauses.length} pause(s) on ${runtime}`)
  }
  fs.writeFileSync(path.join(DIR, `${lesson}.json`), `${JSON.stringify(out, null, 1)}\n`)
}
