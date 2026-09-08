import type { ReactNode } from 'react'
import { pageMetadata } from '@/lib/seo'

export const metadata = pageMetadata({
  title: 'Newsletter preferences',
  description: 'Manage your Memoized newsletter subscription.',
  path: '/blog/unsubscribe',
  index: false,
})

export default function UnsubscribeLayout({
  children,
}: {
  children: ReactNode
}) {
  return children
}
