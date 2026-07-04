/**
 * Simple in-memory rate limiter
 *
 * Note: This is sufficient for single-instance deployments.
 * For distributed/serverless environments, consider Upstash Redis.
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

interface RateLimiterConfig {
  maxRequests: number
  windowMs: number
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
}

/**
 * Creates a rate limiter with the specified configuration
 */
export function createRateLimiter(config: RateLimiterConfig) {
  const limits = new Map<string, RateLimitEntry>()

  return {
    /**
     * Check if a request should be allowed for the given key
     * @param key - Unique identifier (e.g., IP address, email)
     * @returns Rate limit result with allowed status and metadata
     */
    check(key: string): RateLimitResult {
      const now = Date.now()
      const limit = limits.get(key)

      // Clean up expired entries periodically
      if (limits.size > 10000) {
        for (const [k, v] of limits) {
          if (now > v.resetTime) {
            limits.delete(k)
          }
        }
      }

      // No existing limit or expired
      if (!limit || now > limit.resetTime) {
        const resetTime = now + config.windowMs
        limits.set(key, { count: 1, resetTime })
        return {
          allowed: true,
          remaining: config.maxRequests - 1,
          resetTime,
        }
      }

      // Increment count
      limit.count++

      // Check if over limit
      if (limit.count > config.maxRequests) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: limit.resetTime,
        }
      }

      return {
        allowed: true,
        remaining: config.maxRequests - limit.count,
        resetTime: limit.resetTime,
      }
    },

    /**
     * Reset the rate limit for a specific key
     */
    reset(key: string): void {
      limits.delete(key)
    },

    /**
     * Clear all rate limits (useful for testing)
     */
    clear(): void {
      limits.clear()
    },
  }
}
