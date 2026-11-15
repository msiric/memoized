/**
 * Records every frontier program from a real Node run under the inspector
 * (`engines/frontier/truth/record.ts`) into
 * `engines/frontier/recordings/<program>.json`, from which the
 * step-throughs are built. Run `yarn viz:frontier` after changing a program
 * or its probes; `frontier.truth.test.ts` fails until the committed
 * recording matches a fresh run.
 */
import fs from 'fs'
import path from 'path'
import { FRONTIER_PROGRAMS } from '../components/visualizations/engines/frontier/programs'
import { recordFrontier } from '../components/visualizations/engines/frontier/truth/record'

const DIR = path.join('src', 'components', 'visualizations', 'engines', 'frontier', 'recordings')

for (const p of FRONTIER_PROGRAMS) {
  const { runtime, ...rec } = recordFrontier(p)
  fs.writeFileSync(path.join(DIR, `${p.id}.json`), `${JSON.stringify(rec, null, 1)}\n`)
  console.log(`${p.id}: ${rec.pauses.length} pauses, printed ${JSON.stringify(rec.stdout)} on ${runtime}`)
}
