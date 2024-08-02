import LogoIconSvg from '/public/images/brand/icon.svg'
import LogoDefaultSvg from '/public/images/brand/logo-light.svg'
import LogoSquaredSvg from '/public/images/brand/logo-squared-light.svg'

export function Logo(props: React.ComponentPropsWithoutRef<'svg'>) {
  return <LogoDefaultSvg {...props} />
}

export function LogoIcon(props: React.ComponentPropsWithoutRef<'svg'>) {
  return <LogoIconSvg {...props} />
}

export function LogoSquared(props: React.ComponentPropsWithoutRef<'svg'>) {
  return <LogoSquaredSvg {...props} />
}
