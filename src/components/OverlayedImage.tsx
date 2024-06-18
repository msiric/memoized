import clsx from 'clsx'
import Image from 'next/image'
import { ReactNode } from 'react'

export type OverlayedImageProps = {
  src: string
  title: string
  icon?: ReactNode
  alt?: string
  description?: string
}

export const OverlayedImage = ({
  src,
  title,
  icon,
  alt,
  description,
}: OverlayedImageProps) => (
  <article className="relative isolate flex max-w-lg flex-col overflow-hidden rounded-2xl">
    <div className="relative w-full" style={{ aspectRatio: '1705 / 1608' }}>
      <Image
        src={src}
        alt={alt ?? 'Cover image'}
        layout="fill"
        objectFit="cover"
        className="absolute inset-0 h-full w-full origin-top-left scale-200 transform object-cover"
      />
    </div>
    <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-lime-900/10"></div>
    <div className="my-4 flex flex-col px-4">
      <div className="flex items-center justify-start">
        {icon}
        <h3
          className={clsx('z-10 text-xl font-bold text-white', icon && 'ml-2')}
        >
          {title}
        </h3>
      </div>
      {description && (
        <div className="z-10 gap-y-1 overflow-hidden text-sm leading-6 text-zinc-300">
          {description}
        </div>
      )}
    </div>
  </article>
)
