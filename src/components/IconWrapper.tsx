import clsx from 'clsx'
import { JSXElementConstructor } from 'react'

export function IconWrapper({
  icon: Icon,
  className,
  ...props
}: {
  icon: JSXElementConstructor<{ className: string }>
} & React.ComponentPropsWithoutRef<'svg'>) {
  return (
    <div className="flex h-5 w-5 items-center justify-center stroke-2 transition duration-300">
      <Icon
        className={clsx(
          'h-4 w-4 fill-transparent stroke-lime-600 transition-colors duration-300 group-hover:stroke-lime-900 dark:stroke-lime-400 dark:group-hover:fill-lime-300/10 dark:group-hover:stroke-lime-400',
          className,
        )}
        {...props}
      />
    </div>
  )
}
