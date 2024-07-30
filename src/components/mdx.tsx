import { Heading } from '@/components/Heading'
import { LessonStatus } from '@/components/LessonStatus'
import { Prose } from '@/components/Prose'
import { Problem } from '@prisma/client'
import clsx from 'clsx'
import Link from 'next/link'
import { ReactNode } from 'react'
import { FaExternalLinkAlt } from 'react-icons/fa'
import { LessonFeedback } from './LessonFeedback'
import { NextPage } from './NextPage'
import { PracticeProblems } from './PracticeProblems'

export { Button } from '@/components/Button'
export { CodeGroup, Code as code, Pre as pre } from '@/components/Code'
export { DynamicImage as img } from '@/components/DynamicImage'

export type CustomLinkProps = {
  href: string
  children: ReactNode
}

const CustomLink = ({ href, children, ...rest }: CustomLinkProps) => {
  const isExternal = href && (href.startsWith('http') || href.startsWith('//'))

  if (isExternal) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1"
        {...rest}
      >
        {children}
        <FaExternalLinkAlt size="12" />
      </a>
    )
  }

  return (
    <Link href={href} {...rest}>
      {children}
    </Link>
  )
}

const _ResourceLink = ({ href, children, ...rest }: CustomLinkProps) => {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="m-0 inline-flex items-center gap-1"
      {...rest}
    >
      {children}
      <FaExternalLinkAlt size="12" />
    </a>
  )
}

export const a = CustomLink

export const ResourceLink = _ResourceLink

export type WrapperProps = {
  lessonId: string
  problems: Problem[]
  children: ReactNode
}

export const wrapper = function Wrapper({
  lessonId,
  problems,
  children,
}: WrapperProps) {
  return (
    <article className="flex h-full flex-col pb-10 pt-16">
      <Prose className="flex-auto">{children}</Prose>
      <div className="prose flex-auto dark:prose-invert [html_:where(&>*)]:mx-auto [html_:where(&>*)]:max-w-2xl [html_:where(&>*)]:lg:mx-[calc(50%-min(50%,theme(maxWidth.lg)))] [html_:where(&>*)]:lg:max-w-3xl">
        <PracticeProblems problems={problems} />
      </div>
      <div className="mx-auto mt-6 w-full max-w-2xl lg:max-w-5xl">
        <NextPage />
      </div>
      <footer className="mx-auto mt-16 w-full max-w-2xl lg:max-w-5xl">
        <LessonStatus lessonId={lessonId} />
        <LessonFeedback lessonId={lessonId} />
      </footer>
    </article>
  )
}

export const h2 = function H2(
  props: Omit<React.ComponentPropsWithoutRef<typeof Heading>, 'level'>,
) {
  return <Heading level={2} {...props} />
}

function InfoIcon(props: React.ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <circle cx="8" cy="8" r="8" strokeWidth="0" />
      <path
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M6.75 7.75h1.5v3.5"
      />
      <circle cx="8" cy="4" r=".5" fill="none" />
    </svg>
  )
}

export function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-6 flex gap-2.5 rounded-2xl border border-lime-500/20 bg-lime-50/50 p-4 leading-6 text-lime-900 dark:border-lime-500/30 dark:bg-lime-500/5 dark:text-lime-200 dark:[--tw-prose-links-hover:theme(colors.lime.300)] dark:[--tw-prose-links:theme(colors.white)]">
      <InfoIcon className="mt-1 h-4 w-4 flex-none fill-lime-500 stroke-white dark:fill-lime-200/20 dark:stroke-lime-200" />
      <div className="[&>:first-child]:mt-0 [&>:last-child]:mb-0">
        {children}
      </div>
    </div>
  )
}

export function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 items-start gap-x-16 gap-y-10 xl:max-w-none xl:grid-cols-2">
      {children}
    </div>
  )
}

export function Col({
  children,
  sticky = false,
}: {
  children: React.ReactNode
  sticky?: boolean
}) {
  return (
    <div
      className={clsx(
        '[&>:first-child]:mt-0 [&>:last-child]:mb-0',
        sticky && 'xl:sticky xl:top-24',
      )}
    >
      {children}
    </div>
  )
}

export function Properties({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-6">
      <ul
        role="list"
        className="m-0 max-w-[calc(theme(maxWidth.lg)-theme(spacing.8))] list-none divide-y divide-zinc-900/5 p-0 dark:divide-white/5"
      >
        {children}
      </ul>
    </div>
  )
}

export function Property({
  name,
  children,
  type,
}: {
  name: string
  children: React.ReactNode
  type?: string
}) {
  return (
    <li className="m-0 px-0 py-4 first:pt-0 last:pb-0">
      <dl className="m-0 flex flex-wrap items-center gap-x-3 gap-y-2">
        <dt className="sr-only">Name</dt>
        <dd>
          <code>{name}</code>
        </dd>
        {type && (
          <>
            <dt className="sr-only">Type</dt>
            <dd className="font-mono text-xs text-zinc-400 dark:text-zinc-500">
              {type}
            </dd>
          </>
        )}
        <dt className="sr-only">Description</dt>
        <dd className="w-full flex-none [&>:first-child]:mt-0 [&>:last-child]:mb-0">
          {children}
        </dd>
      </dl>
    </li>
  )
}
