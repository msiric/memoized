/**
 * Records the context-and-call-stack trace presets' programs from a real
 * Node run (`engines/event-loop/truth/trace.ts`) into
 * `engines/event-loop/recordings/context-and-call-stack.json` (values only:
 * stdout and frame names). Run `yarn viz:traces` after changing a program;
 * the truth test fails until the committed recording matches a fresh run.
 * The question's snippet is read from the local content checkout and checked
 * against its committed sha256; without the checkout nothing is written.
 */
import fs from 'fs'
import path from 'path'
import { TRACE_PROGRAMS } from '../components/visualizations/engines/event-loop/programs'
import { recordTraces } from '../components/visualizations/engines/event-loop/truth/trace'
import { loadProgram, skipNote } from '../components/visualizations/step-log/lesson-block'

const FILE = path.join('src', 'components', 'visualizations', 'engines', 'event-loop', 'recordings', 'context-and-call-stack.json')
const out: Record<string, unknown> = {}
for (const p of TRACE_PROGRAMS) {
  let text: string
  if ('snippet' in p) text = p.snippet
  else {
    const loaded = loadProgram(p.source)
    if (!loaded.ok) {
      console.warn(`traces: skipped, ${skipNote(loaded.missing)}`)
      process.exit(0)
    }
    text = loaded.text
  }
  const { runtime, ...rec } = recordTraces(text)
  out[p.id] = rec
  console.log(`${p.id}: ${JSON.stringify(rec.traces)} on ${runtime}`)
}
fs.writeFileSync(FILE, `${JSON.stringify(out, null, 1)}\n`)
