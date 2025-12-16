'use client'

import { GridPattern } from '@/components/GridPattern'
import {
  motion,
  MotionValue,
  useMotionTemplate,
  useMotionValue,
} from 'framer-motion'
import Link from 'next/link'
import { ComponentType, MouseEvent as ReactMouseEvent, SVGProps } from 'react'
import { curriculumUI } from '../constants/curriculum'
import { formatPercentage } from '../utils/helpers'

export type CourseProgressProps = {
  percentage: number
  colorClass: string
  label: string
}

const CourseProgress = ({
  percentage,
  colorClass,
  label,
}: CourseProgressProps) => {
  const dashArray = `${formatPercentage(percentage * 0.75)} 100`

  return (
    <div className="relative h-[6rem] w-[6rem] min-w-[6rem] overflow-hidden">
      <svg
        className="size-full rotate-[135deg]"
        viewBox="0 0 36 36"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx="18"
          cy="18"
          r="16"
          fill="none"
          className="stroke-current text-zinc-700/10 dark:text-white/10"
          strokeWidth="1"
          strokeDasharray="75 100"
          strokeLinecap="round"
        ></circle>

        <circle
          cx="18"
          cy="18"
          r="16"
          fill="none"
          className={`stroke-current ${colorClass}`}
          strokeWidth="2"
          strokeDasharray={dashArray}
          strokeLinecap="round"
        ></circle>
      </svg>

      <div className="absolute start-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transform text-center">
        <span className={`text-md font-bold ${colorClass}`}>
          {formatPercentage(percentage)}%
        </span>
        <span className="text-zinc-610 block text-xs dark:text-zinc-400">
          {label}
        </span>
      </div>
    </div>
  )
}

export type CourseIconProps = {
  icon: ComponentType<SVGProps<SVGSVGElement>>
}

const CourseIcon = ({ icon: Icon }: CourseIconProps) => {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900/5 ring-1 ring-zinc-900/25 backdrop-blur-[2px] transition duration-300 group-hover:bg-white/50 group-hover:ring-zinc-900/25 md:h-12 md:w-12 dark:bg-white/7.5 dark:ring-white/15 dark:group-hover:bg-lime-300/10 dark:group-hover:ring-lime-400">
      <Icon className="h-8 w-8 fill-zinc-700/10 stroke-zinc-700 transition-colors duration-300 group-hover:stroke-zinc-900 md:h-10 md:w-10 dark:fill-white/10 dark:stroke-zinc-400 dark:group-hover:fill-lime-300/10 dark:group-hover:stroke-lime-400" />
    </div>
  )
}

export type CoursePatternProps = {
  mouseX: MotionValue<number>
  mouseY: MotionValue<number>
}

const CoursePattern = ({
  mouseX,
  mouseY,
  ...gridProps
}: CoursePatternProps) => {
  const maskImage = useMotionTemplate`radial-gradient(180px at ${mouseX}px ${mouseY}px, white, transparent)`
  const style = { maskImage, WebkitMaskImage: maskImage }

  return (
    <div className="pointer-events-none">
      <div className="absolute inset-0 rounded-2xl transition duration-300 [mask-image:linear-gradient(white,transparent)] group-hover:opacity-50">
        <GridPattern
          width={72}
          height={56}
          x="50%"
          className="absolute inset-x-0 inset-y-[-30%] h-[160%] w-full skew-y-[-18deg] fill-black/[0.02] stroke-black/5 dark:fill-white/1 dark:stroke-white/2.5"
          {...gridProps}
        />
      </div>
      <motion.div
        className="absolute inset-0 rounded-2xl bg-gradient-to-r from-lime-100/75 to-indigo-100 opacity-0 transition duration-300 group-hover:opacity-100 dark:from-lime-900/40 dark:to-indigo-800/30"
        style={style}
      />
      <motion.div
        className="absolute inset-0 rounded-2xl opacity-0 mix-blend-overlay transition duration-300 group-hover:opacity-100"
        style={style}
      >
        <GridPattern
          width={72}
          height={56}
          x="50%"
          className="absolute inset-x-0 inset-y-[-30%] h-[160%] w-full skew-y-[-18deg] fill-black/50 stroke-black/70 dark:fill-white/2.5 dark:stroke-white/10"
          {...gridProps}
        />
      </motion.div>
    </div>
  )
}

export type CourseCardProps = {
  slug: string
  href: string
  title: string
  description: string | null
  progress: {
    lessonProgress: {
      completed: number
      total: number
      percentage: number
    }
    problemProgress: {
      completed: number
      total: number
      percentage: number
    }
  } | null
  lessons: {
    total: number
    free: number
    premium: number
  }
  problems: {
    total: number
    byDifficulty: Record<string, number>
  }
}

export const CourseCard = ({
  slug,
  href,
  title,
  description,
  progress,
  lessons,
  problems,
}: CourseCardProps) => {
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const { pattern, icon } =
    curriculumUI[`/${slug}` as keyof typeof curriculumUI]

  const lessonProgressPercentage = progress?.lessonProgress?.percentage ?? 0
  const problemProgressPercentage = progress?.problemProgress?.percentage ?? 0

  const handleMouseMove = ({
    currentTarget,
    clientX,
    clientY,
  }: ReactMouseEvent<HTMLDivElement>) => {
    const { left, top } = currentTarget.getBoundingClientRect()
    mouseX.set(clientX - left)
    mouseY.set(clientY - top)
  }

  return (
    <div
      key={href}
      onMouseMove={handleMouseMove}
      className="group relative flex rounded-2xl bg-zinc-50 transition-shadow hover:shadow-md hover:shadow-zinc-900/5 dark:bg-white/2.5 dark:hover:shadow-black/5"
    >
      <Link href={href} className="w-full">
        <CoursePattern {...pattern} mouseX={mouseX} mouseY={mouseY} />
        <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-zinc-900/7.5 group-hover:ring-zinc-900/10 dark:ring-white/10 dark:group-hover:ring-white/20" />
        <div className="relative flex w-full items-center justify-between gap-4 rounded-2xl px-4 pb-4 pt-4 md:pt-12">
          <div>
            <CourseIcon icon={icon} />
            <h3 className="mt-4 text-lg sm:text-xl lg:text-2xl font-semibold leading-7 text-zinc-900 dark:text-white">
              <span className="absolute inset-0 rounded-2xl" />
              {title}
            </h3>
            <p className="mt-1 text-xs sm:text-sm lg:text-base text-zinc-600 dark:text-zinc-400">
              {description}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <p className="mt-1 flex flex-col space-x-0 text-xs leading-4 text-zinc-600 xs:flex-row xs:space-x-1 sm:flex-col sm:space-x-0 md:flex-row md:space-x-1 md:text-sm dark:text-zinc-400">
                <span className="text-lime-600 dark:text-lime-500">
                  {lessons.total}
                </span>
                <span>lessons</span>
              </p>
              <p className="mt-1 flex flex-col space-x-0 text-xs leading-4 text-zinc-600 xs:flex-row xs:space-x-1 sm:flex-col sm:space-x-0 md:flex-row md:space-x-1 md:text-sm dark:text-zinc-400">
                <span className="text-indigo-600 dark:text-indigo-500">
                  {problems.total}
                </span>
                <span>problems</span>
              </p>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center">
            <CourseProgress
              percentage={lessonProgressPercentage}
              colorClass="text-lime-600 dark:text-lime-500"
              label="lessons"
            />
            <CourseProgress
              percentage={problemProgressPercentage}
              colorClass="text-indigo-600 dark:text-indigo-500"
              label="problems"
            />
          </div>
        </div>
      </Link>
    </div>
  )
}
