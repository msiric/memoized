import clsx from 'clsx'
import React from 'react'

const ChevronIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M19 9l-7 7-7-7"
    ></path>
  </svg>
)

export const variantStyles = {
  primary:
    'border-zinc-300 bg-zinc-50 text-zinc-900 focus:border-lime-500 focus:ring-lime-500 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white dark:focus:border-lime-500 dark:focus:ring-lime-500',
  secondary:
    'border-zinc-100 bg-zinc-100 text-zinc-900 focus:border-zinc-200 focus:ring-zinc-200 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-400 dark:focus:border-zinc-800 dark:focus:ring-zinc-800',
  outline:
    'border border-zinc-300 bg-transparent text-zinc-700 focus:border-lime-500 focus:ring-lime-500 dark:border-zinc-600 dark:text-white dark:focus:border-lime-500 dark:focus:ring-lime-500',
}

export const sizeStyles = {
  small: 'p-1.5 text-sm',
  medium: 'p-2.5 text-sm',
  large: 'p-3 text-base',
}

export type SelectProps = {
  variant?: keyof typeof variantStyles
  size?: keyof typeof sizeStyles
  options: { value: string; label: string }[]
} & Omit<React.ComponentPropsWithoutRef<'select'>, 'size'>

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    { variant = 'primary', size = 'medium', className, options, ...props },
    ref,
  ) => {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={clsx(
            'focus:ring-0.5 flex appearance-none rounded-lg border p-2.5 pr-10 focus:border-lime-500 focus:outline-none focus:ring-lime-500 dark:placeholder-zinc-400',
            variantStyles[variant],
            sizeStyles[size],
            className,
          )}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-zinc-700 dark:text-white">
          <ChevronIcon />
        </div>
      </div>
    )
  },
)

Select.displayName = 'Select'
