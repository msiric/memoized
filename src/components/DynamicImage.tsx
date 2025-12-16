export type DynamicImageProps = {
  src: string
  alt: string
}

export const DynamicImage = ({ src, alt }: DynamicImageProps) => {
  const isMathEquation = alt && alt.toLowerCase().includes('equation')

  const styles = isMathEquation
    ? {
        filter: 'invert(1)',
      }
    : {}

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} style={styles} />
}
