import { revalidatePath, revalidateTag } from 'next/cache'
import { CATALOG_CACHE_TAG } from '@/services/search'
import { timingSafeEqual } from 'node:crypto'

// Called by the content repository's publish workflow after a successful
// publish, so cached signed-out pages refresh immediately instead of
// within their 7-day revalidate window. Requires Authorization: Bearer <REVALIDATE_SECRET>.
export const dynamic = 'force-dynamic'

const matches = (given: string, expected: string) => {
  const a = Buffer.from(given)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET
  if (!secret || secret.length < 32)
    return Response.json({ revalidated: false, reason: 'not-configured' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  const header = request.headers.get('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : ''
  if (!matches(token, secret))
    return Response.json({ revalidated: false }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
  revalidateTag(CATALOG_CACHE_TAG)
  // Every cached signed-out page (lessons, /courses, /problems, /resources,
  // /premium) and the home page show published content or counts.
  revalidatePath('/public', 'layout')
  revalidatePath('/')
  return Response.json({ revalidated: true, scope: ['catalog', '/public', '/'] }, { headers: { 'Cache-Control': 'no-store' } })
}
