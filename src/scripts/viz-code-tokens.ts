/**
 * Writes pre-computed syntax tokens for every step-through preset to
 * `src/components/visualizations/code-tokens.json`, so no highlighter ships to
 * the browser. Run `yarn viz:tokens` after changing a preset's code.
 */
import fs from 'fs'
import path from 'path'
import { stepThroughLogs } from '../components/visualizations/registry'
import { tokensFor } from '../components/visualizations/step-log/code-tokens'

export const TOKENS_FILE = path.join('src', 'components', 'visualizations', 'code-tokens.json')

async function main() {
  const logs = stepThroughLogs()
  const tokens = await tokensFor(logs)
  fs.writeFileSync(TOKENS_FILE, `${JSON.stringify(tokens, null, 1)}\n`)
  console.log(`Wrote tokens for ${Object.keys(tokens).length} presets to ${TOKENS_FILE}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
