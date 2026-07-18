/**
 * Renders every Mermaid source in `diagrams/*.mmd` to a committed SVG under
 * `public/images/visualizations/<slug>.svg`, themed with the platform palette and a
 * transparent background so it reads on both light and dark lesson pages. The SVGs are
 * committed, so lessons reference them as `![alt](/images/visualizations/<slug>.svg)`
 * with no runtime cost.
 *
 * Run from the repo root via `yarn render-diagrams` whenever a source changes.
 * Rendering uses Puppeteer's Chromium; in an environment without a bundled Chromium,
 * set PUPPETEER_EXECUTABLE_PATH to an existing browser (Puppeteer reads it directly).
 */
import { execFileSync } from 'child_process'
import fs from 'fs'
import path from 'path'

const SRC_DIR = 'diagrams'
const OUT_DIR = path.join('public', 'images', 'visualizations')
const CONFIG_FILE = path.join(SRC_DIR, 'mermaid.config.json')
const PUPPETEER_CONFIG = path.join(SRC_DIR, 'puppeteer.config.json')
const MMDC = path.join('node_modules', '.bin', 'mmdc')

function main() {
  if (!fs.existsSync(SRC_DIR)) {
    console.error(`❌ No ${SRC_DIR}/ directory. Run from the repo root.`)
    process.exit(1)
  }
  fs.mkdirSync(OUT_DIR, { recursive: true })

  const sources = fs.readdirSync(SRC_DIR).filter((file) => file.endsWith('.mmd'))
  if (sources.length === 0) {
    console.log(`No .mmd sources in ${SRC_DIR}/. Nothing to render.`)
    return
  }

  let failed = 0
  for (const source of sources) {
    const slug = path.basename(source, '.mmd')
    const output = path.join(OUT_DIR, `${slug}.svg`)
    try {
      execFileSync(
        MMDC,
        // prettier-ignore
        ['-i', path.join(SRC_DIR, source), '-o', output, '-c', CONFIG_FILE, '-p', PUPPETEER_CONFIG, '-b', 'transparent'],
        { stdio: 'pipe' },
      )
      const svg = fs.readFileSync(output, 'utf8')
      if (!svg.includes('<svg') || !svg.trimEnd().endsWith('</svg>')) {
        throw new Error('rendered output is not a well-formed SVG')
      }
      console.log(`✓ ${slug}.svg`)
    } catch (error) {
      failed += 1
      const err = error as { stderr?: Buffer; message?: string }
      const detail = err.stderr?.toString().trim() || err.message || 'unknown error'
      console.error(`✗ ${slug}: ${detail}`)
    }
  }

  if (failed > 0) {
    console.error(`\n${failed} diagram(s) failed to render.`)
    process.exit(1)
  }
  console.log(`\nRendered ${sources.length} diagram(s) to ${OUT_DIR}/.`)
}

main()
