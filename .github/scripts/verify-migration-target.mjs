import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { pathToFileURL } from 'node:url'

const directTargetFingerprint = 'f822e326a20482d8890ec99bdd6cfc07285a432c598507a9c864cb2194b0cc90'
const allowedParameters = new Set([
  'schema', 'sslmode', 'channel_binding', 'connection_limit',
  'pool_timeout', 'connect_timeout', 'application_name',
])

export function verifyMigrationTarget(databaseUrl, advisoryLockOverride, expectedFingerprint = directTargetFingerprint) {
  assert(typeof databaseUrl === 'string' && databaseUrl.trim(), 'Missing migration database URL')
  assert(advisoryLockOverride === undefined || advisoryLockOverride === '', 'Migration advisory locking must remain enabled')
  let url
  try {
    url = new URL(databaseUrl)
  } catch {
    throw new Error('Invalid migration database URL')
  }
  assert(['postgres:', 'postgresql:'].includes(url.protocol), 'A PostgreSQL migration target is required')
  assert(url.username && url.password && !url.hash, 'Migration credentials and unambiguous routing are required')
  const keys = [...url.searchParams.keys()]
  assert(keys.length === new Set(keys).size, 'Duplicate migration connection parameters are not supported')
  assert(keys.every(key => allowedParameters.has(key)), 'Unsupported migration connection parameter')
  assert(['require', 'verify-ca', 'verify-full'].includes(url.searchParams.get('sslmode')), 'Migration transport must require TLS')
  const target = [url.hostname, url.port || '5432', decodeURIComponent(url.pathname.slice(1)), url.searchParams.get('schema') ?? 'public']
  const fingerprint = createHash('sha256').update(JSON.stringify(target)).digest('hex')
  assert.equal(fingerprint, expectedFingerprint, 'Use the reviewed direct migration target, not a pooler or another database')
  return fingerprint
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    assert(process.argv.length === 2, 'Migration target verification takes no command-line credentials')
    const fingerprint = verifyMigrationTarget(process.env.DATABASE_URL, process.env.PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK)
    console.log(`Verified direct migration target ${fingerprint}`)
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
