import clsx from 'clsx'
import Link from 'next/link'
import React, { MutableRefObject } from 'react'

function ArrowIcon(props: React.ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m11.5 6.5 3 3.5m0 0-3 3.5m3-3.5h-9"
      />
    </svg>
  )
}

export const variantStyles = {
  primary:
    'rounded-full bg-zinc-900 py-1 px-3 text-white hover:bg-zinc-700 dark:bg-lime-400/10 dark:text-lime-400 dark:ring-1 dark:ring-inset dark:ring-lime-400/20 dark:hover:bg-lime-400/10 dark:hover:text-lime-300 dark:hover:ring-lime-300',
  secondary:
    'rounded-full bg-zinc-100 py-1 px-3 text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800/40 dark:text-zinc-400 dark:ring-1 dark:ring-inset dark:ring-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-300',
  filled:
    'rounded-full bg-zinc-900 py-1 px-3 text-white hover:bg-zinc-700 dark:bg-lime-500 dark:text-white dark:hover:bg-lime-400',
  outline:
    'rounded-full py-1 px-3 text-zinc-700 ring-1 ring-inset ring-zinc-900/10 hover:bg-zinc-900/2.5 hover:text-zinc-900 dark:text-zinc-400 dark:ring-white/10 dark:hover:bg-white/5 dark:hover:text-white',
  text: 'text-lime-500 hover:text-lime-600 dark:text-lime-400 dark:hover:text-lime-500',
}

export type ButtonProps = {
  variant?: keyof typeof variantStyles
  arrow?: 'left' | 'right'
  disabled?: boolean
} & (
  | React.ComponentPropsWithoutRef<typeof Link>
  | (React.ComponentPropsWithoutRef<'button'> & { href?: undefined })
)

export const Button = React.forwardRef<
  HTMLButtonElement | HTMLAnchorElement,
  ButtonProps
>(
  (
    { variant = 'primary', className, children, arrow, disabled, ...props },
    ref,
  ) => {
    className = clsx(
      'inline-flex gap-0.5 justify-center overflow-hidden text-sm font-medium transition',
      variantStyles[variant],
      disabled && 'opacity-50 cursor-not-allowed',
      className,
    )

    const arrowIcon = (
      <ArrowIcon
        className={clsx(
          'mt-0.5 h-5 w-5',
          variant === 'text' && 'relative top-px',
          arrow === 'left' && '-ml-1 rotate-180',
          arrow === 'right' && '-mr-1',
        )}
      />
    )

    const inner = (
      <>
        {arrow === 'left' && arrowIcon}
        {children}
        {arrow === 'right' && arrowIcon}
      </>
    )

    if (typeof props.href === 'undefined') {
      return (
        <button
          ref={ref as MutableRefObject<HTMLButtonElement>}
          className={className}
          disabled={disabled}
          {...props}
        >
          {inner}
        </button>
      )
    }

    if (disabled) {
      return (
        <span ref={ref} className={className} {...props}>
          {inner}
        </span>
      )
    }

    return (
      <Link
        ref={ref as MutableRefObject<HTMLAnchorElement>}
        className={className}
        {...props}
      >
        {inner}
      </Link>
    )
  },
)

Button.displayName = 'Button'
