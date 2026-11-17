/**
 * Records the reachability presets' programs (`engines/heap-graph/reach-programs.ts`)
 * with the GC recorder (`truth/record-gc.ts`: Node 24 with --expose-gc, or
 * Chromium for the DOM answers) into `engines/heap-graph/recordings/reach-<lesson>.json`.
 * Run `yarn viz:reach` after changing a program; the truth test fails until the
 * committed recording matches a fresh run. Each block is read from the local
 * content checkout and checked against its sha256; without it nothing is written.
 */
import fs from 'fs'
import path from 'path'
import { MEMORY_LEAKS_PROGRAMS, MEMORY_MANAGEMENT_PROGRAMS } from '../components/visualizations/engines/heap-graph/reach-programs'
import { recordGc } from '../components/visualizations/engines/heap-graph/truth/record-gc'
import { loadProgram, skipNote } from '../components/visualizations/step-log/lesson-block'

const DIR = path.join('src', 'components', 'visualizations', 'engines', 'heap-graph', 'recordings')

async function main() {
  for (const [lesson, programs] of [['memory-management', MEMORY_MANAGEMENT_PROGRAMS], ['memory-leaks', MEMORY_LEAKS_PROGRAMS]] as const) {
    const out: Record<string, unknown> = {}
    for (const p of programs) {
      const loaded = loadProgram(p.source)
      if (!loaded.ok) {
        console.warn(`reach: ${lesson} skipped, ${skipNote(loaded.missing)}`)
        process.exit(0)
      }
      const { runtime, ...rec } = await recordGc(loaded.text, p)
      out[p.id] = rec
      console.log(`${p.id} on ${runtime}: alive ${rec.alive.join(',')} dead ${rec.dead.join(',')}`)
    }
    fs.writeFileSync(path.join(DIR, `reach-${lesson}.json`), `${JSON.stringify(out, null, 1)}\n`)
  }
}
main()
