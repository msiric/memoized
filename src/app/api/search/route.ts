import { meiliSearch } from '@/lib/meili'
import { reportError } from '@/lib/error-tracking'
import { checkPremiumAccess } from '@/services/user'
import { getServerSession } from 'next-auth/next'
import { NextResponse } from 'next/server'
import { authOptions } from '../auth/[...nextauth]/route'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') || ''

  if (!query) {
    return NextResponse.json(
      { error: 'Search query is required' },
      { status: 400 },
    )
  }

  // Get the user's session
  const session = await getServerSession(authOptions)

  // Check if the user has premium access (subscription or owner)
  const isPremiumUser = await checkPremiumAccess(session?.userId)

  try {
    const results = await meiliSearch.index('lessons').search(query, {
      attributesToHighlight: ['title', 'body'],
      highlightPreTag: '<mark>',
      highlightPostTag: '</mark>',
      limit: 5,
      filter: isPremiumUser ? undefined : 'access = FREE',
    })

    return NextResponse.json(results)
  } catch (error) {
    reportError(error, { feature: 'search', action: 'search-lessons' })
    return NextResponse.json(
      { error: 'An error occurred while searching' },
      { status: 500 },
    )
  }
}
