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
  <article className="relative isolate m-auto my-0 flex w-full max-w-md flex-col justify-between overflow-hidden rounded-2xl border border-zinc-200">
    <div className="relative w-full" style={{ aspectRatio: '1705 / 1608' }}>
      <Image
        src={src}
        alt={alt ?? 'Cover image'}
        className="absolute inset-0 h-full w-full origin-top-left scale-200 transform object-cover opacity-80"
        fill
        sizes="100vw"
        style={{
          objectFit: 'cover',
        }}
      />
    </div>
    <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-lime-900/10"></div>
    <div className="relative my-4 flex flex-col px-4">
      {/* Blur effect */}
      <div className="absolute inset-0 backdrop-blur-sm"></div>
      <div className="relative flex items-center justify-start">
        {icon}
        <h3
          className={clsx(
            'relative z-10 text-xl font-bold text-lime-500',
            icon && 'ml-2',
          )}
        >
          {title}
        </h3>
      </div>
      {description && (
        <div className="relative z-10 gap-y-1 overflow-hidden text-sm font-semibold leading-6 text-white">
          {description}
        </div>
      )}
    </div>
  </article>
)
