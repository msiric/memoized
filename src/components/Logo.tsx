import LogoIconSvg from '/public/images/brand/icon.svg'
import LogoDefaultSvgDark from '/public/images/brand/logo-dark.svg'
import LogoDefaultSvgLight from '/public/images/brand/logo-light.svg'
import LogoSquaredSvgDark from '/public/images/brand/logo-squared-dark.svg'
import LogoSquaredSvgLight from '/public/images/brand/logo-squared-light.svg'

type LogoProps = React.ComponentPropsWithoutRef<'svg'>

const Logo = (props: LogoProps) => {
  return (
    <>
      <LogoDefaultSvgDark
        {...props}
        className={`${props.className} dark:hidden`}
      />
      <LogoDefaultSvgLight
        {...props}
        className={`${props.className} hidden dark:block`}
      />
    </>
  )
}

const LogoIcon = (props: LogoProps) => {
  return <LogoIconSvg {...props} />
}

const LogoSquared = (props: LogoProps) => {
  return (
    <>
      <LogoSquaredSvgDark
        {...props}
        className={`${props.className} dark:hidden`}
      />
      <LogoSquaredSvgLight
        {...props}
        className={`${props.className} hidden dark:block`}
      />
    </>
  )
}

export { Logo, LogoIcon, LogoSquared }
