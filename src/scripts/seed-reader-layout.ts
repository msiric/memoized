import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { PrismaClient } from '@prisma/client'
import { serialize } from 'next-mdx-remote-client/serialize'
import { assertCompiledMdx } from '../lib/mdx-result'

async function main() {
  assert.equal(process.env.READER_LAYOUT_FIXTURE, '1', 'Explicit fixture opt-in is required')
  const target = new URL(process.env.DATABASE_URL ?? '')
  assert(['localhost', '127.0.0.1'].includes(target.hostname))
  assert.equal(target.pathname, '/memoized_ci', 'Fixtures may only use the disposable CI database')
  const output = process.env.READER_LAYOUT_REPORT_DIR
  assert(output, 'Set READER_LAYOUT_REPORT_DIR outside the source tree')
  const prisma = new PrismaClient()
  try {
    assert.equal(await prisma.course.count(), 0, 'Expected a fresh fixture database')
    assert.equal(await prisma.resource.count(), 0)
    assert.equal(await prisma.user.count(), 0)
    const { mdxOptions } = await import('../mdx/index.mjs')
    const compile = async (source: string) => {
      const result = await serialize({ source, options: { mdxOptions, scope: {} } })
      assertCompiledMdx(result, 'reader layout fixture')
      return { compiledSource: result.compiledSource, scope: {}, frontmatter: {} }
    }
    const body = [
      '# Reader layout fixture',
      'Synthetic content for checking the real page layout. This is not curriculum material.',
      ...Array.from({ length: 12 }, (_, index) =>
        `## Example ${index + 1}\n\nA paragraph keeps the lesson long enough to exercise intrinsic height, its practice area and the page footer.`),
      '- Program\n  - FunctionDeclaration\n    - BlockStatement\n      - ReturnStatement\n        - **BinaryExpressionWithALongIdentifier**',
      '```javascript\nconsole.log("Last body block")\n```',
    ].join('\n\n')
    const serializedBody = await compile(body)
    const course = await prisma.course.create({ data: {
      slug: 'js-track', contentId: '/js-track', title: 'JS Track', order: 1,
      href: '/courses/js-track', body, serializedBody,
    } })
    const section = await prisma.section.create({ data: {
      slug: 'core-fundamentals', contentId: '/js-track/core-fundamentals',
      title: 'Core Fundamentals', order: 1, href: '/courses/js-track/core-fundamentals',
      body, serializedBody, courseId: course.id,
    } })
    const routes = ['/courses/js-track', '/courses/js-track/core-fundamentals']
    const fixtures = [
      { slug: 'data-types', title: 'Data Types', access: 'FREE' },
      { slug: 'type-coercion', title: 'A long adjacent lesson title that must wrap on a narrow screen', access: 'FREE' },
      { slug: 'scope-and-hoisting', title: 'Premium preview fixture', access: 'PREMIUM' },
    ] as const
    for (const [index, fixture] of fixtures.entries()) {
      const href = `/courses/js-track/core-fundamentals/${fixture.slug}`
      const lesson = await prisma.lesson.create({ data: {
        ...fixture, contentId: href.slice('/courses'.length), href, order: index + 1,
        description: 'A synthetic reader layout fixture.', body, serializedBody, sectionId: section.id,
      } })
      for (let number = 1; number <= 3; number++) {
        const slug = `layout-question-${number}`
        const question = 'Explain what the example prints.'
        const answer = 'The value is printed by the call.\n\n```javascript\nconsole.log("Layout fixture")\n```'
        await prisma.problem.create({ data: {
          title: `Layout question ${number}`, slug, contentId: `${lesson.contentId}/${slug}`,
          lessonId: lesson.id, href: '', link: `${href}#${slug}`,
          type: 'THEORY', difficulty: 'EASY', question, answer,
          serializedQuestion: await compile(question), serializedAnswer: await compile(answer),
        } })
      }
      routes.push(href)
    }
    for (const [index, fixture] of [
      { slug: 'intro', access: 'FREE' },
      { slug: 'layout-reference', access: 'FREE' },
      { slug: 'locked-layout-reference', access: 'PREMIUM' },
    ].entries()) {
      const href = fixture.slug === 'intro' ? '/resources' : `/resources/${fixture.slug}`
      await prisma.resource.create({ data: {
        slug: fixture.slug, title: 'Reader reference fixture', contentId: `/resources/${fixture.slug}`,
        description: 'Synthetic reference content.', href, order: index,
        access: fixture.access === 'FREE' ? 'FREE' : 'PREMIUM', body, serializedBody,
      } })
      routes.push(href)
    }
    fs.mkdirSync(output, { recursive: true })
    fs.writeFileSync(path.join(output, 'config.json'), JSON.stringify({
      baseUrl: 'http://127.0.0.1:3014',
      outputDirectory: output,
      routes,
      widths: [320, 1440, 3840],
      roles: [{ name: 'anonymous' }],
      screenshotRoutes: ['/courses/js-track/core-fundamentals/data-types'],
    }, null, 2) + '\n', { flag: 'wx' })
    console.log(`Prepared ${routes.length} synthetic reader routes in memoized_ci`)
  } finally { await prisma.$disconnect() }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
