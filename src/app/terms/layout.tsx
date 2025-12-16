import { MinimalLayout } from '@/layouts/minimal'
import '@/styles/tailwind.css'

export default async function TermsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <MinimalLayout centered>{children}</MinimalLayout>
}
