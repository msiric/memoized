/**
 * Strict offline/source baseline validation, not a live headline count.
 * Admit 506 baseline tasks, 507 with exact G3B, or 508 with exact G3B and G3C.
 * G3C remains fail-closed until its complete reviewed question/setup is bound.
 * Preparing the whole catalog also verifies raw/compiled fields and resources.
 */
import path from 'node:path'
import { validContentIds } from '@/lib/content-identity'
import { assertKnownSourceCatalog } from './content-release/scope'
import { prepareSnapshot } from './content-release/plan'
import { describeCatalog } from './content-release/catalog'

export async function verifyContentStats(root = path.join(process.cwd(), 'src')) {
  assertKnownSourceCatalog(root)
  const expected = validContentIds(path.join(root, 'content'))
  const rows = await prepareSnapshot(root)
  const manifest = describeCatalog(rows)
  for (const kind of Object.keys(expected) as (keyof typeof expected)[]) {
    const actual = rows.filter(row => row.kind === kind)
    if (actual.length !== expected[kind].size || actual.some(row => !expected[kind].has(row.contentId))) {
      throw new Error(`Prepared ${kind} catalog differs from authoritative source identities`)
    }
  }
  return manifest
}

if (require.main === module) {
  verifyContentStats()
    .then(manifest => console.log('✅ Authorized complete source catalog:', JSON.stringify(manifest)))
    .catch(error => {
      console.error(error instanceof Error ? error.message : 'Source catalog validation failed')
      process.exitCode = 1
    })
}
