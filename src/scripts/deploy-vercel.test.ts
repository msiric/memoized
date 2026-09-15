import { describe, expect, it, vi } from 'vitest'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { deploymentPlan, executeDeployment, VERCEL_CLI_VERSION } from '../../.github/scripts/deploy-vercel.mjs'

const sha = 'a'.repeat(40)
const input = {
  env: {
    GITHUB_EVENT_NAME: 'push', GITHUB_REF: 'refs/heads/master',
    GITHUB_REPOSITORY: 'msiric/memoized', GITHUB_SHA: sha, GITHUB_ACTOR: 'msiric',
    VERCEL_TOKEN: 'synthetic-token', VERCEL_ORG_ID: 'team_synthetic',
    VERCEL_PROJECT_ID: 'prj_synthetic',
  },
  checkoutSha: sha, nodeVersion: 'v24.21.0', requiredNode: '24.x',
  installedCliVersion: VERCEL_CLI_VERSION, commitMessage: 'A reviewed change',
}
const expectedTarget = createHash('sha256').update(JSON.stringify([input.env.VERCEL_ORG_ID, input.env.VERCEL_PROJECT_ID])).digest('hex')
const planFor = (value = input) => deploymentPlan(value, expectedTarget)
const result = (status: number) => ({ status, signal: null, pid: 1, output: [], stdout: Buffer.alloc(0), stderr: Buffer.alloc(0) })

describe('fixed-project Node deployment', () => {
  it('retains production, source metadata and both configured project selectors', () => {
    const plan = planFor()
    expect(plan.args).toContain('--prod')
    expect(plan.args).toContain(`githubCommitSha=${sha}`)
    expect(plan.args).toContain('githubCommitRef=master')
    expect(plan.env.VERCEL_ORG_ID).toBe(input.env.VERCEL_ORG_ID)
    expect(plan.env.VERCEL_PROJECT_ID).toBe(input.env.VERCEL_PROJECT_ID)
    expect(plan.args).not.toContain('--scope')
    expect(plan.args).not.toContain('--yes')
    expect(plan.args).not.toContain('--public')
    expect(plan.args).not.toContain('--prebuilt')
  })

  it.each([
    { GITHUB_EVENT_NAME: 'pull_request' },
    { GITHUB_REF: 'refs/heads/feature' },
    { GITHUB_REPOSITORY: 'other/repository' },
    { GITHUB_SHA: 'master' },
    { VERCEL_TOKEN: '' },
    { VERCEL_ORG_ID: '' },
    { VERCEL_PROJECT_ID: '' },
    { VERCEL_ORG_ID: 'team_other' },
    { VERCEL_PROJECT_ID: 'prj_other' },
  ])('fails closed before deployment for invalid context %#', change => {
    expect(() => planFor({ ...input, env: { ...input.env, ...change } })).toThrow()
  })

  it('requires source, runtime and CLI agreement', () => {
    expect(() => planFor({ ...input, checkoutSha: 'b'.repeat(40) })).toThrow()
    expect(() => planFor({ ...input, nodeVersion: 'v20.20.2' })).toThrow()
    expect(() => planFor({ ...input, installedCliVersion: '50.0.0' })).toThrow()
    expect(() => deploymentPlan(input)).toThrow('Configured target differs')
  })

  it('passes commit text as data without invoking a shell', () => {
    const commitMessage = 'quotes "\n$(untrusted-input)'
    const plan = planFor({ ...input, commitMessage })
    const execute = vi.fn<typeof spawnSync>().mockReturnValue(result(0))
    executeDeployment({ plan, executable: '/node24', cliEntry: '/cli.js', cwd: '/workspace' }, execute)
    expect(execute).toHaveBeenCalledOnce()
    expect(execute.mock.calls[0][1]).toContain(`githubCommitMessage=${commitMessage}`)
    expect(execute.mock.calls[0][2]).toMatchObject({ shell: false, stdio: ['ignore', 'inherit', 'inherit'] })
  })

  it('never retries or drops project selectors after the personal-account scope error', () => {
    const plan = planFor()
    const execute = vi.fn<typeof spawnSync>().mockReturnValue(result(1))
    expect(() => executeDeployment({ plan, executable: '/node24', cliEntry: '/cli.js', cwd: '/workspace' }, execute)).toThrow()
    expect(execute).toHaveBeenCalledOnce()
    expect(plan.env.VERCEL_ORG_ID).toBe(input.env.VERCEL_ORG_ID)
    expect(plan.env.VERCEL_PROJECT_ID).toBe(input.env.VERCEL_PROJECT_ID)
  })
})
