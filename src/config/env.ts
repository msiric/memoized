import { isDevelopment, isProduction, isTest } from '../utils/helpers'

export function getSiteUrl(): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL

  if (siteUrl) {
    // Ensure URL doesn't end with slash for consistency
    return siteUrl.replace(/\/$/, '')
  }

  if (isDevelopment()) {
    return 'http://localhost:3000'
  }

  if (isTest()) {
    return 'https://test.memoized.io'
  }

  console.warn(
    'NEXT_PUBLIC_SITE_URL not set, using fallback. This should be configured in production.',
  )
  return 'https://www.memoized.io'
}

interface EnvironmentConfig {
  // Public variables (exposed to client)
  NEXT_PUBLIC_SITE_URL: string
  NEXT_PUBLIC_SENTRY_DSN?: string

  // Server-only variables
  NEXTAUTH_SECRET: string
  NEXTAUTH_URL: string
  DATABASE_URL: string

  // Third-party integrations
  STRIPE_SECRET: string
  STRIPE_WEBHOOK: string
  RESEND_TOKEN: string
  MEILISEARCH_HOST: string
  MEILISEARCH_MASTER_KEY: string

  // OAuth providers (at least one required)
  AUTH_GITHUB_ID?: string
  AUTH_GITHUB_SECRET?: string
  AUTH_GOOGLE_ID?: string
  AUTH_GOOGLE_SECRET?: string
}

export function validateEnvironment(): void {
  const errors: string[] = []

  // Always required
  const criticalVars = [
    'NEXT_PUBLIC_SITE_URL',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
    'DATABASE_URL',
    'STRIPE_SECRET',
    'STRIPE_WEBHOOK',
    'RESEND_TOKEN',
    'MEILISEARCH_HOST',
    'MEILISEARCH_MASTER_KEY',
  ]

  // Check critical variables
  criticalVars.forEach((varName) => {
    const value = process.env[varName]
    if (!value || value.trim() === '') {
      errors.push(`${varName} is required but not set`)
    }
  })

  // Validate OAuth providers (at least one must be configured)
  const hasGitHub = process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET
  const hasGoogle = process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET

  if (!hasGitHub && !hasGoogle) {
    errors.push(
      'At least one OAuth provider must be configured (GitHub or Google)',
    )
  }

  // Validate URL formats
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (siteUrl && !isValidUrl(siteUrl)) {
    errors.push('NEXT_PUBLIC_SITE_URL must be a valid URL')
  }

  const nextAuthUrl = process.env.NEXTAUTH_URL
  if (nextAuthUrl && !isValidUrl(nextAuthUrl)) {
    errors.push('NEXTAUTH_URL must be a valid URL')
  }

  const meilisearchHost = process.env.MEILISEARCH_HOST
  if (meilisearchHost && !isValidUrl(meilisearchHost)) {
    errors.push('MEILISEARCH_HOST must be a valid URL')
  }

  // Validate Stripe keys format
  const stripeSecret = process.env.STRIPE_SECRET
  if (stripeSecret && !stripeSecret.startsWith('sk_')) {
    errors.push('STRIPE_SECRET must start with "sk_"')
  }

  const stripeWebhook = process.env.STRIPE_WEBHOOK
  if (stripeWebhook && !stripeWebhook.startsWith('whsec_')) {
    errors.push('STRIPE_WEBHOOK must start with "whsec_"')
  }

  if (errors.length > 0) {
    console.error('Environment validation failed:')
    errors.forEach((error) => console.error(`  - ${error}`))

    // Only fail in production, warn in development
    if (isProduction()) {
      throw new Error(
        `Environment validation failed: ${errors.length} error(s) found`,
      )
    } else {
      console.warn(
        '⚠️  Environment validation failed, but continuing in development mode',
      )
    }
  } else {
    console.log('✅ Environment validation passed')
  }
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Get environment variables with type safety
 * Only use this after validateEnvironment() has been called
 */
export function getEnvironment(): EnvironmentConfig {
  return {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL!,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET!,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL!,
    DATABASE_URL: process.env.DATABASE_URL!,
    STRIPE_SECRET: process.env.STRIPE_SECRET!,
    STRIPE_WEBHOOK: process.env.STRIPE_WEBHOOK!,
    RESEND_TOKEN: process.env.RESEND_TOKEN!,
    MEILISEARCH_HOST: process.env.MEILISEARCH_HOST!,
    MEILISEARCH_MASTER_KEY: process.env.MEILISEARCH_MASTER_KEY!,
    AUTH_GITHUB_ID: process.env.AUTH_GITHUB_ID,
    AUTH_GITHUB_SECRET: process.env.AUTH_GITHUB_SECRET,
    AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
    AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,
  }
}
