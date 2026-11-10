// Cached signed-out copy; reached only via the middleware rewrite. force-static
// gives the shared services an empty request (no cookies), so every session
// read resolves to "signed out" and nothing personal can be rendered here.
export { default, metadata } from '@/app/resources/layout'
export const dynamic = 'force-static'
// Pages reading the hourly catalog cache regenerate hourly; publishing also
// revalidates /public on demand.
export const revalidate = 604800 // 7 d safety net; publishing revalidates /public on demand
