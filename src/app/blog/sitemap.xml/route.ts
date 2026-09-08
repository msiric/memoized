import { permanentRedirect } from 'next/navigation'

/** One catalog-driven sitemap is authoritative for all public destinations. */
export function GET() {
  permanentRedirect('/sitemap.xml')
}
