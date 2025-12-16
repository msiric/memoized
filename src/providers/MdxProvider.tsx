import { MDXProvider as MDXJSProvider } from '@mdx-js/react'
import { MDXComponents } from 'mdx/types'
import { useMDXComponents } from '../../mdx-components'

const MdxProvider = ({ children }: { children: React.ReactNode }) => {
  const components = useMDXComponents({})

  return (
    <MDXJSProvider components={components as Readonly<MDXComponents>}>
      {children}
    </MDXJSProvider>
  )
}

export default MdxProvider
