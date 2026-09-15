import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { G4_OLD_READER_SHA } from './guided-path-state-fixture'

const read = (name: string) => readFileSync(name, 'utf8')
const manifest = JSON.parse(read('package.json'))

describe('Node runtime release contract', () => {
  it('declares Node24 and matching types without changing the package manager', () => {
    expect(manifest.engines.node).toBe('24.x')
    expect(manifest.devDependencies['@types/node']).toMatch(/^\^24\./)
    expect(manifest.packageManager).toBe('yarn@1.22.22')
    expect(manifest.scripts.prebuild).toBe('node --version && yarn run migrate')
  })

  it('takes current CI and deployment runtimes from the package contract', () => {
    const ci = read('.github/workflows/ci.yml')
    const production = read('.github/workflows/production.yml')
    expect(ci.match(/node-version-file: package\.json/g)).toHaveLength(2)
    expect(production.match(/node-version-file: package\.json/g)).toHaveLength(1)
    expect(ci.match(/uses: actions\/setup-node@v7/g)).toHaveLength(3)
    expect(production.match(/uses: actions\/setup-node@v7/g)).toHaveLength(1)
    expect(production).not.toMatch(/node-version:\s*['"]?20/)
    expect(ci).toContain('corepack enable')
    expect(production).toContain('corepack enable')
  })

  it('rehearses recovery with the actual previous Node20 app and its own dependencies', () => {
    const ci = read('.github/workflows/ci.yml')
    expect(G4_OLD_READER_SHA).toBe('191a0b9983b3f497480ad7dc33a6b8305393d32b')
    expect(ci).toContain(`G4_OLD_READER_SHA: ${G4_OLD_READER_SHA}`)
    expect(ci).toContain("node-version: '20.20.2'")
    expect(ci).toContain('HUSKY=0 corepack yarn@1.22.22 install --frozen-lockfile')
    expect(ci).not.toContain('ln -s "$GITHUB_WORKSPACE/node_modules" "$baseline/node_modules"')
    expect(ci).toContain('"$NODE24_BIN" node_modules/next/dist/bin/next start')
    expect(ci).toContain('"$NODE24_BIN" --import tsx src/scripts/check-guided-path-state.ts compat')
    expect(ci).toContain("G4_OLD_READER_FLAG_ENABLED: 'true'")
  })
})
