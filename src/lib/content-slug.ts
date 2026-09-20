import slugify from 'slugify'
import { SLUGIFY_OPTIONS } from '@/constants'

export function contentSlug(title: string): string {
  return slugify(title.replaceAll('/', '-'), SLUGIFY_OPTIONS)
}
