// pages/api/search.ts or app/api/search/route.ts
import { meiliSearch } from '@/lib/meili'
import { getServerSession } from 'next-auth/next'
import { NextResponse } from 'next/server'
import prisma from '../../../lib/prisma' // adjust the import path as needed
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

  // Check if the user has an active premium subscription
  let isPremiumUser = false
  if (session?.user?.email) {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        customer: { select: { subscriptions: { select: { status: true } } } },
      },
    })
    isPremiumUser =
      user?.customer?.subscriptions.some((sub) => sub.status === 'ACTIVE') ??
      false
  }

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
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'An error occurred while searching' },
      { status: 500 },
    )
  }
}
