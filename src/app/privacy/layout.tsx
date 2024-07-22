import { MinimalLayout } from '@/layouts/minimal'
import '@/styles/tailwind.css'

export default async function PrivacyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <MinimalLayout>{children}</MinimalLayout>
}
