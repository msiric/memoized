import { revalidatePath } from 'next/cache'
import { timingSafeEqual } from 'node:crypto'

// Called by the content repository's publish workflow after a successful
// publish, so cached signed-out lesson pages refresh immediately instead of
// within their 6 h revalidate window. Requires Authorization: Bearer <REVALIDATE_SECRET>.
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
  revalidatePath('/public/courses', 'layout')
  return Response.json({ revalidated: true, scope: '/public/courses' }, { headers: { 'Cache-Control': 'no-store' } })
}
