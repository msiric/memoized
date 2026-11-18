/**
 * Records the service-worker lifecycle scenarios in real Chromium
 * (`engines/sw-lifecycle/truth/record.ts`) into
 * `engines/sw-lifecycle/recordings/service-workers.json`, from which the
 * steps are built. Run `yarn viz:sw` after changing a scenario or the
 * worker; `sw-lifecycle.truth.test.ts` fails until the committed recording
 * matches a fresh run. The worker and page are the visual's own code (no
 * lesson text), so no content checkout is needed; Playwright's Chromium is.
 */
import fs from 'fs'
import path from 'path'
import { recordSw } from '../components/visualizations/engines/sw-lifecycle/truth/record'

const FILE = path.join('src', 'components', 'visualizations', 'engines', 'sw-lifecycle', 'recordings', 'service-workers.json')

async function main() {
  const { runtime, ...rec } = await recordSw()
  fs.writeFileSync(FILE, `${JSON.stringify(rec, null, 1)}\n`)
  console.log(`service-workers: ${Object.keys(rec.scenarios).length} scenarios in ${rec.browser} (${runtime})`)
}

void main()
