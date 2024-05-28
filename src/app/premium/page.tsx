import { Logo } from '@/components/Logo'
import Link from 'next/link'

export default function Premium() {
  return (
    <section className="bg-white dark:bg-zinc-900">
      <div className="mx-6 mt-4 flex">
        <Link href="/" aria-label="Home">
          <Logo className="h-6" />
        </Link>
      </div>
      <div className="mx-auto max-w-screen-xl px-4 py-8 lg:px-6 lg:py-16">
        <div className="mx-auto mb-8 max-w-screen-md text-center lg:mb-12">
          <p className="font-bold text-gray-500 sm:text-xl dark:text-gray-400">
            The ultimate JavaScript platform for mastering coding interviews.
          </p>
          <p className="mb-5 font-light text-gray-500 sm:text-xl dark:text-gray-400">
            Invest in your future, enhance your skills, and land your dream job
            with confidence.
          </p>
        </div>
        <div style={{ colorScheme: 'normal' }}>
          <stripe-pricing-table
            pricing-table-id="prctbl_1PK2cXBOG7dj7GmqJoLiYhdc"
            publishable-key="pk_test_51PK2N0BOG7dj7GmqXFf7oVMmR9TyqnHEeOgnSckPaGKNGnIrQQy3yk80XpjkOk8wyhhx0JG2YxCwdfPyBXGOzxCd00JOY2d9cr"
          ></stripe-pricing-table>
        </div>
      </div>
    </section>
  )
}
