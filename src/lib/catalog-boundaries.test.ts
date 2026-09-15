// @vitest-environment node
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import ts from 'typescript'
import { CONTENT_STATS, ContentStats } from '@/constants/content-stats'

const read = (file: string) =>
  readFileSync(path.join(process.cwd(), file), 'utf8')
const imports = (file: string) => {
  const source = ts.createSourceFile(
    file,
    read(file),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  return source.statements
    .filter(ts.isImportDeclaration)
    .map((statement) => (statement.moduleSpecifier as ts.StringLiteral).text)
}

describe('bounded catalog architecture', () => {
  it('retains the publisher baseline export and values, with a numeric DTO type', () => {
    expect(CONTENT_STATS).toEqual({
      courses: 2,
      sections: 8,
      lessons: 120,
      problems: 506,
      resources: 33,
    })
    const active: ContentStats = { ...CONTENT_STATS, problems: 507 }
    expect(active.problems).toBe(507)
  })

  it('keeps root metadata/JSON-LD evergreen and does not fetch counts or make the site dynamic', () => {
    const root = read('src/app/layout.tsx')
    expect(root).toContain(
      "const description = 'Prepare for JavaScript and TypeScript interviews with theory and coding problems",
    )
    expect(root).toContain('isPreviewDeployment')
    expect(root).toContain("'@type': 'WebSite'")
    expect(root).not.toMatch(
      /CONTENT_STATS|CatalogStats|catalog-request|catalog-stats|force-dynamic|noStore|no-store|revalidate\s*=/,
    )
    expect(
      imports('src/app/layout.tsx').some((module) =>
        /services\/|prisma/.test(module),
      ),
    ).toBe(false)
  })

  it('preserves homepage hourly ISR and banner/Stripe flow with exactly one local provider', () => {
    const home = read('src/app/page.tsx')
    expect(home).toMatch(/export const revalidate = 3600/)
    expect(home).toContain('getUnifiedBanners()')
    expect(home).toContain('discountPercent={banner.discountPercent}')
    expect(home.match(/<CatalogStatsProvider>/g)).toHaveLength(1)
    expect(home).not.toMatch(
      /CONTENT_STATS|force-dynamic|noStore|getPublicCatalogStats|getCatalogStatsSnapshot/,
    )
    expect(read('src/app/providers.tsx')).not.toContain('CatalogStats')
  })

  it('removes the source baseline from every owned learner count surface', () => {
    const surfaces = [
      'src/app/layout.tsx',
      'src/app/premium/page.tsx',
      'src/app/premium/layout.tsx',
      'src/app/courses/(courses)/page.tsx',
      'src/app/courses/(courses)/layout.tsx',
      'src/app/problems/@table/page.tsx',
      'src/app/problems/layout.tsx',
      'src/components/ContentOverview.tsx',
      'src/components/SolveProblems.tsx',
      'src/components/FreeOfferingHighlight.tsx',
    ]
    for (const file of surfaces) {
      expect(read(file), file).not.toMatch(/CONTENT_STATS|\b50[67]\b/)
    }
  })

  it('keeps public counting independent of auth, content, publishing, and source APIs', () => {
    expect(imports('src/app/api/catalog-stats/route.ts')).toEqual([
      'next/server',
      '@/services/catalog-stats',
      '@/lib/sentry',
      '@/types/catalog-stats',
    ])
    expect(imports('src/services/catalog-stats.ts')).toEqual([
      '@/lib/prisma',
      '@prisma/client',
      '@/types/catalog-stats',
    ])
    expect(read('src/services/catalog-stats.ts')).not.toMatch(
      /\.findMany|\.findUnique|\.create|\.update|\.delete|\.upsert|serialized|userId|revalidate|fetch\(/,
    )
  })

  it('makes only the request-dependent catalog entry points explicitly dynamic', () => {
    for (const file of [
      'src/app/courses/(courses)/layout.tsx',
      'src/app/problems/layout.tsx',
      'src/app/premium/layout.tsx',
    ]) {
      expect(read(file), file).toContain("export const dynamic = 'force-dynamic'")
    }
  })

  it('keeps React request memoization out of the existing Node CLI service modules', () => {
    for (const file of [
      'src/services/course.ts',
      'src/services/problem.ts',
      'src/services/lesson.ts',
    ]) {
      expect(imports(file), file).not.toContain('react')
      expect(read(file), file).not.toContain('@/lib/catalog-request')
    }
    const request = read('src/lib/catalog-request.ts')
    expect(request).toContain("import { cache } from 'react'")
    expect(request).not.toMatch(
      /unstable_cache|noStore|force-dynamic|revalidateTag|revalidatePath|globalThis/,
    )
    expect(
      read('src/components/ContentOverview.tsx').startsWith("'use client'"),
    ).toBe(false)
    expect(
      read('src/components/SolveProblems.tsx').startsWith("'use client'"),
    ).toBe(true)
    expect(
      read('src/components/FreeOfferingHighlight.tsx').startsWith(
        "'use client'",
      ),
    ).toBe(true)
  })
})
