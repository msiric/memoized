import { notFound } from 'next/navigation'
import { serialize } from 'next-mdx-remote-client/serialize'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { Header } from '@/components/Header'
import { Navigation } from '@/components/Navigation'
import { PreserializedMdxRenderer } from '@/components/PreserializedMdxRenderer'
import { CourseProviders } from '@/app/courses/[courseSlug]/providers'
import type { NavigationContent } from '@/types'
import { LESSON_FIXTURES, lessonSource } from '../fixtures'

/**
 * Dev-only lesson-context harness (VIZ-H G): a real lesson's MDX through the
 * real pipeline (`serialize` with the app's mdxOptions, then the same
 * `PreserializedMdxRenderer` and MDX components a lesson page uses), inside
 * the real course layout (header, sidebar, prose column, footer), with no
 * database. The visuals sit where the lesson would place them
 * (`../fixtures.ts`), so their consistency is judged in context. Gated out
 * of production exactly like `/dev/visualizations`.
 */

export function generateStaticParams() {
  return LESSON_FIXTURES.filter((f) => f.file).map((f) => ({ slug: f.slug }))
}

export default async function LessonContextPage({ params }: { params: { slug: string } }) {
  if (process.env.NODE_ENV === 'production' && process.env.VIZ_GALLERY !== '1') notFound()
  const fixture = LESSON_FIXTURES.find((f) => f.slug === params.slug)
  if (!fixture) notFound()
  const source = lessonSource(fixture)

  const here = `/dev/visualizations/lesson/${fixture.slug}`
  // The sidebar: the fixture lessons as one course section, the current one active.
  const navigation: NavigationContent = {
    id: 'js-track',
    slug: 'js-track',
    title: 'JavaScript',
    description: null,
    order: 0,
    href: '/courses/js-track',
    sections: [
      {
        id: 'fixtures',
        slug: 'fixtures',
        title: 'Lesson context (fixtures)',
        href: '/dev/visualizations/lesson',
        description: null,
        order: 0,
        links: LESSON_FIXTURES.map((f, i) => ({
          id: f.slug,
          slug: f.slug,
          title: f.title,
          href: `/dev/visualizations/lesson/${f.slug}`,
          order: i,
          access: 'FREE' as const,
        })),
      },
    ],
  }

  const header = (
    <Breadcrumbs
      items={[
        { title: 'Courses', href: '/courses' },
        { title: 'JavaScript', href: '/courses/js-track' },
        { title: fixture.section.title, href: fixture.section.href },
        { title: fixture.title, href: here },
      ]}
    />
  )

  let body
  if (!source) {
    body = (
      <p data-lesson-missing className="mx-auto max-w-2xl py-16 text-sm leading-6 text-zinc-300">
        {fixture.title} is a premium lesson and is not committed. It renders from a local content checkout (
        <code>src/content/{fixture.source.replace(/^content\//, '')}</code>) only.
      </p>
    )
  } else {
    const { mdxOptions } = await import('@/mdx/index.mjs')
    const serialized = await serialize({ source, options: { mdxOptions, scope: {} } })
    if ('error' in serialized) throw serialized.error
    body = (
      <div data-lesson-context={fixture.slug}>
        <PreserializedMdxRenderer
          header={header}
          serializedContent={serialized as never}
          showNextPage={false}
        />
      </div>
    )
  }

  return (
    <CourseProviders
      header={<Header navigation={navigation} />}
      navigation={<Navigation navigation={navigation} className="hidden lg:mt-10 lg:block" />}
      allSections={{}}
    >
      {body}
    </CourseProviders>
  )
}
