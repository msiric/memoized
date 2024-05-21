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

  return <img src={src} alt={alt} style={styles} />
}
