'use client'

import { ImageLightbox } from './ImageLightbox'

export type BlogImageProps = {
  src: string
  alt: string
}

export const BlogImage = ({ src, alt }: BlogImageProps) => {
  const isMathEquation = alt && alt.toLowerCase().includes('equation')

  const styles = isMathEquation
    ? {
        filter: 'invert(1)',
      }
    : {}

  // For math equations, don't use lightbox
  if (isMathEquation) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} style={styles} />
  }

  // Wrap regular images in lightbox
  return (
    <ImageLightbox src={src} alt={alt}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img 
        src={src} 
        alt={alt} 
        className="transition-opacity hover:opacity-90"
      />
    </ImageLightbox>
  )
}
