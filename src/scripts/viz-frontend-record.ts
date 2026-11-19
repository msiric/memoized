/**
 * Records the wave 4D frontend figures' runs into
 * `engines/annotated-tree/recordings/{state-management,micro-frontends,accessibility,git}.json`:
 * React 19 render logs (the practice answer's blocks from the local content
 * checkout, checked against their sha256), a webpack 5 Module Federation
 * shell and remotes in Chromium (needs `VIZ_MF_DIR`, a prepared harness),
 * the accessibility fragment's tree in Chromium, and the git scenario with
 * the real `git`. A recording whose inputs are absent is skipped, saying so.
 */
import fs from 'fs'
import path from 'path'
import { AX_HTML, RENDER_PROGRAMS } from '../components/visualizations/engines/annotated-tree/programs/frontend'
import { federationDir, prepareFederationHarness, recordFederation } from '../components/visualizations/engines/annotated-tree/truth/federation'
import { recordAx, recordGit, recordRenders } from '../components/visualizations/engines/annotated-tree/truth/record-frontend'
import { loadProgram, skipNote } from '../components/visualizations/step-log/lesson-block'

const DIR = path.join('src', 'components', 'visualizations', 'engines', 'annotated-tree', 'recordings')
const write = (name: string, value: unknown) => fs.writeFileSync(path.join(DIR, `${name}.json`), `${JSON.stringify(value, null, 1)}\n`)

async function main() {
  const loaded = RENDER_PROGRAMS.map((p) => ({ id: p.id, l: loadProgram(p.source) }))
  const missing = loaded.find((p) => !p.l.ok)
  if (missing && !missing.l.ok) console.warn(`renders: skipped, ${skipNote(missing.l.missing)}`)
  else {
    const rec = await recordRenders(loaded.map((p) => ({ id: p.id, code: (p.l as { text: string }).text })))
    write('state-management', rec)
    console.log(`renders on React ${rec.react}`)
  }

  const dir = federationDir()
  if (dir) {
    const rec = await recordFederation(dir)
    write('micro-frontends', rec)
    console.log(`federation with webpack ${rec.webpack} in ${rec.browser}`)
  } else console.warn(`federation: skipped, set VIZ_MF_DIR to a harness prepared with:\n${prepareFederationHarness('$VIZ_MF_DIR')}`)

  const ax = await recordAx(AX_HTML)
  write('accessibility', ax)
  console.log(`accessibility tree in ${ax.browser}`)

  const git = recordGit()
  write('git', git)
  console.log(`git scenario with ${git.git}`)
}

void main()
