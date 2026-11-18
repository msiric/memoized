/**
 * Records the ssr-stream visual's run (`engines/ssr-stream/truth/run.ts`):
 * React 19's real stream on Node 24 and what Chromium showed and logged,
 * into `engines/ssr-stream/recordings/server-side-rendering.json`. Run
 * `yarn viz:ssr` after changing the app or the recorder;
 * `ssr-stream.truth.test.ts` fails until the committed recording matches a
 * fresh run. The app is the visual's own: no content checkout is needed.
 */
import fs from 'fs'
import path from 'path'
import { recordSsr } from '../components/visualizations/engines/ssr-stream/truth/record'

const { runtime, ...rec } = recordSsr()
const file = path.join('src', 'components', 'visualizations', 'engines', 'ssr-stream', 'recordings', 'server-side-rendering.json')
fs.writeFileSync(file, `${JSON.stringify(rec, null, 1)}\n`)
console.log(`server-side-rendering: React ${rec.react}, ${rec.browser}, on ${runtime}`)
