import { LessonView, lessonPageMetadata, type LessonParams } from '@/app/courses/lesson-view'

// Cached signed-out lesson. Reached only through the middleware rewrite of
// /courses/{course}/{section}/{lesson} for requests without a session cookie;
// direct requests to /public/* are redirected to the canonical URL.
// force-static makes any accidental cookie/session read a build error.
export const dynamic = 'force-static'
export const dynamicParams = true
export const revalidate = 604800 // 7 d safety net; publishing revalidates /public on demand

export function generateStaticParams(): LessonParams[] {
  return [] // rendered on first request, then served from cache
}

export function generateMetadata({ params }: { params: LessonParams }) {
  return lessonPageMetadata({ params })
}

export default async function SignedOutLesson({ params }: { params: LessonParams }) {
  return LessonView({ params, signedOut: true })
}
