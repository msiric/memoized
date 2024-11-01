import { Footer } from '@/components/Footer'
import { MinimalHeader } from '@/components/MinimalHeader'
import { getActiveCoursesWithProgress } from '../../services/course'

export default async function Courses() {
  const courses = await getActiveCoursesWithProgress()

  return (
    <section className="bg-white dark:bg-zinc-900">
      <MinimalHeader />
      <div className="mx-auto mt-6 max-w-screen-xl px-4 py-4 xs:py-8 md:py-16 lg:px-6">
        <div className="mx-auto mb-8 max-w-screen-md text-center lg:mb-12">
          <h2 className="mb-4 text-2xl font-extrabold tracking-tight text-zinc-900 xs:text-3xl md:text-4xl dark:text-white">
            The ultimate JavaScript platform for mastering coding interviews
          </h2>
          <p className="mb-5 font-light text-zinc-600 sm:text-xl dark:text-zinc-400">
            Invest in your future, enhance your skills and land your dream job
            with confidence
          </p>
        </div>
        {courses?.map((course) => <div key={course.id}>{course.title}</div>)}
      </div>
      <Footer />
    </section>
  )
}
