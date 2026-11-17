/**
 * Records the lanes figures' runs into `engines/lanes/recordings/*.json`:
 * the debounce/throttle timeline and the OAuth exchange (Node 24), the
 * event dispatch (Chromium through Playwright) and the union/intersection
 * checks (the repo's TypeScript). Run `yarn viz:lanes` after changing a
 * program; the truth tests fail until the committed recordings match a
 * fresh run. Lesson code is read from the local content checkout and
 * checked against its sha256; a recording whose code is absent is skipped.
 */
import fs from 'fs'
import path from 'path'
import { DISPATCH_HTML, DISPATCH_JS, DISPATCH_SCENARIOS } from '../components/visualizations/engines/lanes/programs/dispatch'
import { pkceSource } from '../components/visualizations/engines/lanes/programs/pkce'
import { timersSource } from '../components/visualizations/engines/lanes/programs/timers'
import { TYPE_CASES } from '../components/visualizations/engines/lanes/programs/types'
import { recordDispatch, recordPkce, recordTimers, recordTypes } from '../components/visualizations/engines/lanes/truth/record'
import { loadProgram, skipNote } from '../components/visualizations/step-log/lesson-block'

const DIR = path.join('src', 'components', 'visualizations', 'engines', 'lanes', 'recordings')
const write = (name: string, value: unknown) => fs.writeFileSync(path.join(DIR, `${name}.json`), `${JSON.stringify(value, null, 1)}\n`)

async function main() {
  const timers = loadProgram(timersSource)
  if (timers.ok) {
    const { runtime, ...rec } = recordTimers(timers.text)
    write('performance-optimization', rec)
    console.log(`timers on ${runtime}`)
  } else console.warn(`timers: skipped, ${skipNote(timers.missing)}`)

  const pkce = loadProgram(pkceSource)
  if (pkce.ok) {
    const { runtime, ...rec } = recordPkce(pkce.text)
    write('security', rec)
    console.log(`pkce on ${runtime}`)
  } else console.warn(`pkce: skipped, ${skipNote(pkce.missing)}`)

  const html = loadProgram([DISPATCH_HTML])
  const js = loadProgram([DISPATCH_JS])
  if (html.ok && js.ok) {
    const { runtime, ...rec } = await recordDispatch(html.text, js.text, DISPATCH_SCENARIOS)
    write('event-handling', rec)
    console.log(`dispatch in ${rec.browser} (${runtime})`)
  } else console.warn(`dispatch: skipped, ${skipNote(!html.ok ? html.missing : !js.ok ? js.missing : '')}`)

  const types = await recordTypes(TYPE_CASES)
  write('advanced-types', types)
  console.log(`types with tsc ${types.tsc}`)
}

void main()
