import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { PreserializedMdxRenderer } from '@/components/PreserializedMdxRenderer'
import { getCourseBySlug, getCoursesSlugs } from '@/services/course'
import { getServerSession } from 'next-auth'
import { notFound } from 'next/navigation'

export async function generateStaticParams() {
  const courses = await getCoursesSlugs()
  return courses?.map((course) => ({ courseSlug: course.slug }))
}

export default async function Course({
  params,
}: {
  params: {
    courseSlug: string
  }
}) {
  const course = await getCourseBySlug(params.courseSlug)

  if (!course) {
    return notFound()
  }

  return <PreserializedMdxRenderer serializedContent={course.serializedBody} />
}
