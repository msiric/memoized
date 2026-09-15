import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync, spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const VERCEL_CLI_VERSION = '59.17.0'
const targetFingerprint = '467fb0d5a4cd0c60b36e2af54529e6f083bc11d9e051b59905ee2ca8766b17a6'

export function deploymentPlan({ env, checkoutSha, nodeVersion, requiredNode, installedCliVersion, commitMessage = '' }, expectedTargetFingerprint = targetFingerprint) {
  assert.equal(env.GITHUB_EVENT_NAME, 'push', 'Production deployment requires the reviewed push workflow')
  assert.equal(env.GITHUB_REF, 'refs/heads/master')
  assert.equal(env.GITHUB_REPOSITORY, 'msiric/memoized')
  assert.match(env.GITHUB_SHA ?? '', /^[a-f0-9]{40}$/)
  assert.equal(checkoutSha, env.GITHUB_SHA, 'Checked-out files must match deployment metadata')
  assert.match(requiredNode, /^\d+\.x$/)
  assert.equal(nodeVersion.replace(/^v/, '').split('.')[0], requiredNode.split('.')[0], 'Use the declared Node runtime')
  assert.equal(installedCliVersion, VERCEL_CLI_VERSION, 'Use the pinned deployment CLI')
  assert(typeof env.VERCEL_TOKEN === 'string' && env.VERCEL_TOKEN.trim(), 'Missing Vercel credential')
  assert.match(env.VERCEL_ORG_ID ?? '', /^team_[A-Za-z0-9]+$/, 'A complete fixed target is required')
  assert.match(env.VERCEL_PROJECT_ID ?? '', /^prj_[A-Za-z0-9]+$/, 'A complete fixed target is required')
  const fingerprint = createHash('sha256').update(JSON.stringify([env.VERCEL_ORG_ID, env.VERCEL_PROJECT_ID])).digest('hex')
  assert.equal(fingerprint, expectedTargetFingerprint, 'Configured target differs from the reviewed project')
  const [owner, repository] = env.GITHUB_REPOSITORY.split('/')
  const metadata = {
    githubCommitSha: env.GITHUB_SHA,
    githubCommitRef: 'master',
    githubCommitOrg: owner,
    githubCommitRepo: repository,
    githubOrg: owner,
    githubRepo: repository,
    githubDeployment: '1',
    ...(env.GITHUB_ACTOR ? {
      githubCommitAuthorName: env.GITHUB_ACTOR,
      githubCommitAuthorLogin: env.GITHUB_ACTOR,
    } : {}),
    ...(commitMessage ? { githubCommitMessage: commitMessage } : {}),
  }
  return {
    args: ['--prod', `--token=${env.VERCEL_TOKEN}`, ...Object.entries(metadata).flatMap(([key, value]) => ['--meta', `${key}=${value}`])],
    env: { ...env, VERCEL_TELEMETRY_DISABLED: '1' },
    fingerprint,
  }
}

/**
 * @param {{plan: ReturnType<typeof deploymentPlan>, executable: string, cliEntry: string, cwd: string}} options
 * @param {(command: string, args: string[], options: import('node:child_process').SpawnSyncOptions) => Pick<import('node:child_process').SpawnSyncReturns<string | Buffer>, 'status' | 'signal' | 'error'>} [execute]
 */
export function executeDeployment(options, execute = spawnSync) {
  const { plan, executable, cliEntry, cwd } = options
  const result = execute(executable, [cliEntry, ...plan.args], {
    cwd, env: plan.env, stdio: ['ignore', 'inherit', 'inherit'], shell: false,
  })
  if (result.error) throw new Error(`Deployment CLI could not start (${result.error.code ?? result.error.name})`)
  assert.equal(result.signal, null, 'Deployment CLI was terminated')
  assert.equal(result.status, 0, 'Deployment CLI failed; target selectors are never removed and no retry is attempted')
}

async function main() {
  if (process.argv[2] === '--cli-version') {
    console.log(VERCEL_CLI_VERSION)
    return
  }
  assert.deepEqual(process.argv.slice(2), ['deploy'])
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
  assert.equal(path.resolve(process.env.GITHUB_WORKSPACE ?? ''), root)
  assert(process.env.RUNNER_TEMP && process.env.VERCEL_CLI_ROOT)
  const cliRoot = path.resolve(process.env.VERCEL_CLI_ROOT)
  assert.equal(cliRoot, path.resolve(process.env.RUNNER_TEMP, 'vercel-cli'))
  const cliPackage = path.join(cliRoot, 'node_modules/vercel')
  const installed = JSON.parse(fs.readFileSync(path.join(cliPackage, 'package.json'), 'utf8'))
  const cliEntry = path.resolve(cliPackage, installed.bin.vercel)
  assert(!path.relative(cliPackage, cliEntry).startsWith('..'))
  assert(fs.statSync(cliEntry).isFile())
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
  const checkoutSha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
  const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'))
  assert.equal(event.head_commit?.id, process.env.GITHUB_SHA)
  const plan = deploymentPlan({
    env: process.env, checkoutSha, nodeVersion: process.version,
    requiredNode: manifest.engines.node, installedCliVersion: installed.version,
    commitMessage: event.head_commit.message,
  })
  const link = path.join(root, '.vercel/project.json')
  if (fs.existsSync(link)) {
    const linked = JSON.parse(fs.readFileSync(link, 'utf8'))
    assert.equal(linked.orgId, process.env.VERCEL_ORG_ID)
    assert.equal(linked.projectId, process.env.VERCEL_PROJECT_ID)
  }
  console.log(`Deploying reviewed SHA ${checkoutSha} with Node ${process.version}, CLI ${installed.version}, target ${plan.fingerprint}`)
  executeDeployment({ plan, executable: process.execPath, cliEntry, cwd: root })
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(error.message)
    process.exitCode = 1
  })
}
