import { getCourseNavigationSnapshot } from '@/lib/course-navigation-request'
import { Curriculum, LessonConfig, ProblemConfig } from '@/types'
import { Wrapper } from '@/app/courses/[courseSlug]/@navigation/wrapper'

// Signed-out navigation: curriculum without progress, no session read.
export default async function Navigation({ params }: { params: { courseSlug: string } }) {
  const data = await getCourseNavigationSnapshot(undefined)
  return (
    <Wrapper
      userData={data?.user}
      courseSlug={params.courseSlug}
      fullCurriculum={data?.curriculum as Curriculum[]}
      allLessons={data?.lessons as LessonConfig[]}
      allProblems={data?.problems as ProblemConfig[]}
    />
  )
}
