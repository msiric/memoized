// Cached signed-out copy; reached only via the middleware rewrite. force-static
// gives the shared services an empty request (no cookies), so every session
// read resolves to "signed out" and nothing personal can be rendered here.
export { default, generateMetadata } from '@/app/courses/(courses)/layout'
export const dynamic = 'force-static'
export const revalidate = 21600 // publishing revalidates /public on demand
