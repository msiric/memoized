import { NextResponse } from 'next/server'
import { getProblemContent } from '@/services/problem'
import { reportErrorSafely } from '@/lib/sentry'

export const dynamic = 'force-dynamic'

// Practice questions and answers are free for everyone (the bank page served them
// all to anonymous visitors before), and the response carries no per-user data,
// so a shared cache is safe. After a content sync a corrected answer can be
// served from the CDN for up to s-maxage + stale-while-revalidate (2 minutes).
const cachedHeaders = {
  'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=60',
}
const uncachedHeaders = { 'Cache-Control': 'no-store' }

// Problem.id is a free-form string (UUIDs in production, readable ids in CI seeds).
const PROBLEM_ID = /^[A-Za-z0-9_-]{1,128}$/

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  if (!PROBLEM_ID.test(params.id)) {
    return NextResponse.json({ error: 'not-found' }, { status: 404, headers: uncachedHeaders })
  }
  try {
    const content = await getProblemContent(params.id)
    if (!content) {
      return NextResponse.json({ error: 'not-found' }, { status: 404, headers: uncachedHeaders })
    }
    return NextResponse.json(content, { headers: cachedHeaders })
  } catch (error) {
    reportErrorSafely(error, { feature: 'problem', action: 'content' })
    return NextResponse.json({ error: 'unavailable' }, { status: 503, headers: uncachedHeaders })
  }
}
