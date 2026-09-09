import fs from 'node:fs'
import path from 'node:path'
import { parseArgs } from 'node:util'
import prisma from '@/lib/prisma'
import { archiveContent, fullRevision, verifyAppRevision, verifyEnvironment } from './content-release/inputs'
import { applyInPlaceRelease, checkReleaseState, describeInPlacePlan, planInPlaceRelease, readReleaseCatalog, type ChangeResult } from './content-release/plan'
import { digest } from './content-release/scope'

function required(value: string | undefined, name: string) {
  if (!value?.trim()) throw new Error(`Missing required --${name}`)
  return value
}

function message(error: unknown) {
  const text = error instanceof Error ? error.message : 'Unknown publication failure'
  return text.replace(/postgres(?:ql)?:\/\/\S+/gi, '[database URL redacted]').slice(0, 1200)
}

export async function publishContent(args = process.argv.slice(2)) {
  const { values } = parseArgs({
    args,
    options: {
      repository: { type: 'string' }, base: { type: 'string' }, candidate: { type: 'string' },
      app: { type: 'string' }, environment: { type: 'string' }, report: { type: 'string' },
      approval: { type: 'string' }, apply: { type: 'boolean', default: false },
      independent: { type: 'boolean', default: false },
      'expected-plan': { type: 'string' },
    },
  })
  const appRoot = process.cwd()
  const repository = path.resolve(required(values.repository, 'repository'))
  const base = fullRevision(required(values.base, 'base'), 'Base revision')
  const candidate = fullRevision(required(values.candidate, 'candidate'), 'Candidate revision')
  const app = fullRevision(required(values.app, 'app'), 'App revision')
  const environment = verifyEnvironment(
    JSON.parse(fs.readFileSync(required(values.environment, 'environment'), 'utf8')),
    required(process.env.DATABASE_URL, 'configured DATABASE_URL'),
    required(process.env.MEILISEARCH_HOST, 'configured MEILISEARCH_HOST'),
  )
  if (values.apply && (!values.independent || !values.approval?.trim())) {
    throw new Error('Apply requires an approval reference and explicit confirmation of independent edits')
  }
  if (values.apply && !/^[a-f0-9]{64}$/.test(values['expected-plan'] ?? '')) {
    throw new Error('Apply requires the SHA256 of the separately reviewed plan')
  }
  if (values.apply && environment.mode === 'production' && process.env.GITHUB_ACTIONS !== 'true') {
    throw new Error('Production application is restricted to the reviewed publishing workflow')
  }
  verifyAppRevision(appRoot, app)
  const report = path.resolve(required(values.report, 'report'))
  const relative = path.relative(appRoot, report)
  if (relative === '' || (!relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative))) {
    throw new Error('Keep the publication journal outside the app checkout')
  }
  fs.mkdirSync(path.dirname(report), { recursive: true })
  const record: {
    schemaVersion: number
    status: string
    startedAt: string
    completedAt?: string
    appRevision: string
    baseContentRevision: string
    candidateContentRevision: string
    environmentLabel: string
    environmentMode: string
    environmentSha256: string
    approval: string | null
    apply: boolean
    independentEditsConfirmed: boolean
    plan?: ReturnType<typeof describeInPlacePlan>
    planSha256?: string
    changes: ChangeResult[]
    indexEvents: unknown[]
    indexResult?: unknown
    failure?: string
    cleanup: string
  } = {
    schemaVersion: 1, status: 'preparing', startedAt: new Date().toISOString(),
    appRevision: app, baseContentRevision: base, candidateContentRevision: candidate,
    environmentLabel: environment.label, environmentMode: environment.mode,
    environmentSha256: digest(JSON.stringify(environment)), approval: values.approval ?? null,
    apply: values.apply, independentEditsConfirmed: values.independent,
    changes: [], indexEvents: [], cleanup: 'pending',
  }
  // Reserve the journal before mutations. Never overwrite a previous run.
  fs.writeFileSync(report, JSON.stringify(record, null, 2) + '\n', { flag: 'wx', mode: 0o600 })
  const save = () => {
    const temporary = `${report}.tmp-${process.pid}`
    fs.writeFileSync(temporary, JSON.stringify(record, null, 2) + '\n', { mode: 0o600 })
    fs.renameSync(temporary, report)
  }
  const archives: ReturnType<typeof archiveContent>[] = []
  try {
    archives.push(archiveContent(repository, base))
    archives.push(archiveContent(repository, candidate))
    const plan = await planInPlaceRelease(archives[0].directory, archives[1].directory)
    record.plan = describeInPlacePlan(plan)
    record.planSha256 = digest(JSON.stringify({
      app, base, candidate, environmentSha256: record.environmentSha256, plan: record.plan,
    }))
    if (values.apply && values['expected-plan'] !== record.planSha256) {
      throw new Error('Prepared release differs from the separately reviewed plan')
    }
    checkReleaseState(plan, await readReleaseCatalog())
    verifyAppRevision(appRoot, app)
    record.status = 'planned'
    save()
    if (values.apply) {
      record.status = 'persisting'
      save()
      await applyInPlaceRelease(plan, (change) => {
        record.changes.push(change)
        save()
      })
      if (plan.changes.length) {
        record.status = 'indexing'
        save()
        const { indexLessons } = await import('./index-search')
        record.indexResult = await indexLessons({
          onProgress: (event) => {
            record.indexEvents.push(event)
            save()
          },
        })
      }
      record.status = plan.changes.length ? 'published-awaiting-live-acceptance' : 'unchanged'
    }
  } catch (error) {
    record.status = 'failed'
    record.failure = message(error)
    save()
    throw error
  } finally {
    try {
      for (const archive of archives) archive.dispose()
      record.cleanup = 'succeeded'
    } catch (error) {
      record.cleanup = 'failed'
      record.failure = [record.failure, message(error)].filter(Boolean).join('; ')
      throw error
    } finally {
      record.completedAt = new Date().toISOString()
      save()
    }
  }
  console.log(`Content release status: ${record.status}; plan: ${record.planSha256}; journal: ${report}`)
  return record
}

if (require.main === module) {
  publishContent()
    .catch((error) => {
      console.error(message(error))
      process.exitCode = 1
    })
    .finally(() => prisma.$disconnect())
}
