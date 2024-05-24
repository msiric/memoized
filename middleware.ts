import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

const PREMIUM_PAGES = ['/admin']

export default withAuth(
  function middleware(req) {
    const requestId = uuidv4()

    const requestHeaders = new Headers(req.headers)
    requestHeaders.set('requestId', requestId)
    requestHeaders.set('x-url', req.url)
    requestHeaders.set('x-method', req.method)

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        const pathname = req.nextUrl.pathname
        // Check authorization
        if (
          PREMIUM_PAGES.some((page) => pathname.startsWith(page)) &&
          (token === null ||
            //!(token.role as AccountRole[]).includes('ADMIN')
            false)
        ) {
          return false
        }
        return true
      },
    },
  },
)
