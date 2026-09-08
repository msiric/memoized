import type { MetadataRoute } from 'next'
import { getSearchCatalog, searchUrls } from '@/services/search'
import { isPreviewDeployment } from '@/lib/seo'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (isPreviewDeployment()) return []
  // Catalog updatedAt changes on every content sync, not just editorial changes.
  // Omit lastmod rather than claim that unchanged pages were updated.
  return searchUrls(await getSearchCatalog()).map((url) => ({ url }))
}
