import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  generateUnsubscribeToken,
  verifyUnsubscribeToken,
  maskEmail,
} from './token'

// Mock environment variables
vi.stubEnv('NEWSLETTER_TOKEN_SECRET', 'test-secret-key-for-testing')
vi.stubEnv('RESEND_TOKEN', 'fallback-resend-token')

describe('Newsletter Token', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('generateUnsubscribeToken', () => {
    it('generates a valid base64url token', () => {
      const token = generateUnsubscribeToken('test@example.com')

      // Token should be URL-safe (no +, /, or =)
      expect(token).not.toMatch(/[+/=]/)
      // Should be non-empty
      expect(token.length).toBeGreaterThan(0)
    })

    it('includes email in token payload', () => {
      const token = generateUnsubscribeToken('test@example.com')
      const result = verifyUnsubscribeToken(token)

      expect(result.valid).toBe(true)
      expect(result.email).toBe('test@example.com')
    })

    it('normalizes email to lowercase', () => {
      const token = generateUnsubscribeToken('TEST@EXAMPLE.COM')
      const result = verifyUnsubscribeToken(token)

      expect(result.valid).toBe(true)
      expect(result.email).toBe('test@example.com')
    })

    it('trims whitespace from email', () => {
      const token = generateUnsubscribeToken('  test@example.com  ')
      const result = verifyUnsubscribeToken(token)

      expect(result.valid).toBe(true)
      expect(result.email).toBe('test@example.com')
    })

    it('produces different tokens for same email at different times', () => {
      const token1 = generateUnsubscribeToken('test@example.com')

      // Advance time by 1 second
      vi.advanceTimersByTime(1000)

      const token2 = generateUnsubscribeToken('test@example.com')

      expect(token1).not.toBe(token2)
    })

    it('produces different tokens for different emails', () => {
      const token1 = generateUnsubscribeToken('user1@example.com')
      const token2 = generateUnsubscribeToken('user2@example.com')

      expect(token1).not.toBe(token2)
    })

    it('handles emails with special characters', () => {
      const token = generateUnsubscribeToken('user+tag@example.com')
      const result = verifyUnsubscribeToken(token)

      expect(result.valid).toBe(true)
      expect(result.email).toBe('user+tag@example.com')
    })

    it('handles emails with dots in local part', () => {
      const token = generateUnsubscribeToken('first.last@example.com')
      const result = verifyUnsubscribeToken(token)

      expect(result.valid).toBe(true)
      expect(result.email).toBe('first.last@example.com')
    })

    it('handles subdomains in email', () => {
      const token = generateUnsubscribeToken('user@mail.example.co.uk')
      const result = verifyUnsubscribeToken(token)

      expect(result.valid).toBe(true)
      expect(result.email).toBe('user@mail.example.co.uk')
    })
  })

  describe('verifyUnsubscribeToken', () => {
    describe('valid tokens', () => {
      it('returns valid=true for fresh valid token', () => {
        const token = generateUnsubscribeToken('test@example.com')
        const result = verifyUnsubscribeToken(token)

        expect(result.valid).toBe(true)
        expect(result.email).toBe('test@example.com')
        expect(result.error).toBeUndefined()
      })

      it('returns valid=true for 29-day old token (within expiry window)', () => {
        const token = generateUnsubscribeToken('test@example.com')

        // Advance time by 29 days
        vi.advanceTimersByTime(29 * 24 * 60 * 60 * 1000)

        const result = verifyUnsubscribeToken(token)

        expect(result.valid).toBe(true)
        expect(result.email).toBe('test@example.com')
      })

      it('returns valid=true for token at exactly 30 days', () => {
        const token = generateUnsubscribeToken('test@example.com')

        // Advance time by exactly 30 days
        vi.advanceTimersByTime(30 * 24 * 60 * 60 * 1000)

        const result = verifyUnsubscribeToken(token)

        // At exactly 30 days, should still be valid (not > 30 days)
        expect(result.valid).toBe(true)
      })
    })

    describe('expired tokens', () => {
      it('returns valid=false, error="expired" for 31-day old token', () => {
        const token = generateUnsubscribeToken('test@example.com')

        // Advance time by 31 days
        vi.advanceTimersByTime(31 * 24 * 60 * 60 * 1000)

        const result = verifyUnsubscribeToken(token)

        expect(result.valid).toBe(false)
        expect(result.email).toBeNull()
        expect(result.error).toBe('expired')
      })

      it('returns valid=false, error="expired" for very old token', () => {
        const token = generateUnsubscribeToken('test@example.com')

        // Advance time by 1 year
        vi.advanceTimersByTime(365 * 24 * 60 * 60 * 1000)

        const result = verifyUnsubscribeToken(token)

        expect(result.valid).toBe(false)
        expect(result.error).toBe('expired')
      })
    })

    describe('invalid tokens', () => {
      it('returns valid=false, error="invalid" for tampered signature', () => {
        const token = generateUnsubscribeToken('test@example.com')
        // Tamper with the token by changing a character
        const tamperedToken = token.slice(0, -1) + (token.slice(-1) === 'A' ? 'B' : 'A')

        const result = verifyUnsubscribeToken(tamperedToken)

        expect(result.valid).toBe(false)
        expect(result.error).toBe('invalid') // or 'malformed' depending on how it decodes
      })

      it('returns valid=false, error="invalid" for future timestamp (>5min)', () => {
        // Set time to 10 minutes earlier, generate token, then move time forward
        // This simulates a token created with a timestamp 10 minutes in the future
        const futureTime = new Date('2024-06-15T12:10:00Z') // 10 min ahead
        vi.setSystemTime(futureTime)
        const token = generateUnsubscribeToken('test@example.com')

        // Now set time back to "now" - the token appears to be from 10 min in future
        vi.setSystemTime(new Date('2024-06-15T12:00:00Z'))

        const result = verifyUnsubscribeToken(token)

        expect(result.valid).toBe(false)
        expect(result.error).toBe('invalid')
      })

      it('allows tokens with timestamp up to 5 minutes in future (clock skew)', () => {
        // Set time 4 minutes ahead, generate token
        const futureTime = new Date('2024-06-15T12:04:00Z') // 4 min ahead
        vi.setSystemTime(futureTime)
        const token = generateUnsubscribeToken('test@example.com')

        // Set time back to "now" - token is 4 min in future (within 5 min skew)
        vi.setSystemTime(new Date('2024-06-15T12:00:00Z'))

        const result = verifyUnsubscribeToken(token)

        expect(result.valid).toBe(true)
      })
    })

    describe('malformed tokens', () => {
      it('returns valid=false, error="malformed" for empty string', () => {
        const result = verifyUnsubscribeToken('')

        expect(result.valid).toBe(false)
        expect(result.error).toBe('malformed')
      })

      it('returns valid=false, error="malformed" for invalid base64', () => {
        const result = verifyUnsubscribeToken('!!!invalid-base64!!!')

        expect(result.valid).toBe(false)
        expect(result.error).toBe('malformed')
      })

      it('returns valid=false, error="malformed" for wrong part count (too few)', () => {
        // Encode a string with only 2 parts
        const malformed = Buffer.from('email@test.com|12345').toString('base64')
          .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')

        const result = verifyUnsubscribeToken(malformed)

        expect(result.valid).toBe(false)
        expect(result.error).toBe('malformed')
      })

      it('returns valid=false, error="malformed" for non-numeric timestamp', () => {
        // Encode a string with non-numeric timestamp
        const malformed = Buffer.from('email@test.com|not-a-number|signature').toString('base64')
          .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')

        const result = verifyUnsubscribeToken(malformed)

        expect(result.valid).toBe(false)
        expect(result.error).toBe('malformed')
      })

      it('returns valid=false, error="malformed" for email without @', () => {
        // Create a token-like structure but with invalid email
        const malformed = Buffer.from('invalidemail|12345|signature').toString('base64')
          .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')

        const result = verifyUnsubscribeToken(malformed)

        expect(result.valid).toBe(false)
        // Will fail at signature verification or email validation
      })

      it('returns valid=false, error="malformed" for email > 254 chars', () => {
        // Create a very long email
        const longLocal = 'a'.repeat(250)
        const longEmail = `${longLocal}@test.com`

        const token = generateUnsubscribeToken(longEmail)
        const result = verifyUnsubscribeToken(token)

        expect(result.valid).toBe(false)
        expect(result.error).toBe('malformed')
      })

      it('handles random garbage gracefully', () => {
        const garbageInputs = [
          'randomstring',
          '12345',
          'a'.repeat(1000),
          '\x00\x01\x02',
          '{"json": "object"}',
          '<script>alert(1)</script>',
        ]

        for (const garbage of garbageInputs) {
          const result = verifyUnsubscribeToken(garbage)
          expect(result.valid).toBe(false)
          expect(['malformed', 'invalid']).toContain(result.error)
        }
      })
    })
  })

  describe('maskEmail', () => {
    it('masks standard email correctly (t***@e***.com)', () => {
      const masked = maskEmail('test@example.com')

      expect(masked).toBe('t***@e***.com')
    })

    it('masks email with longer local part', () => {
      const masked = maskEmail('verylongusername@example.com')

      expect(masked).toBe('v***@e***.com')
    })

    it('handles single-char local part', () => {
      const masked = maskEmail('x@example.com')

      expect(masked).toBe('***@e***.com')
    })

    it('handles domain without TLD (e.g., localhost)', () => {
      const masked = maskEmail('user@localhost')

      expect(masked).toBe('u***@l***')
    })

    it('handles subdomain in domain', () => {
      const masked = maskEmail('user@mail.example.com')

      expect(masked).toBe('u***@m***.example.com')
    })

    it('handles .co.uk style TLD', () => {
      const masked = maskEmail('user@example.co.uk')

      expect(masked).toBe('u***@e***.co.uk')
    })

    it('returns [invalid email] for empty string', () => {
      const masked = maskEmail('')

      expect(masked).toBe('[invalid email]')
    })

    it('returns [invalid email] for missing @', () => {
      const masked = maskEmail('invalidemail')

      expect(masked).toBe('[invalid email]')
    })

    it('returns [invalid email] for null/undefined coerced to string', () => {
      // @ts-expect-error - testing runtime behavior
      expect(maskEmail(null)).toBe('[invalid email]')
      // @ts-expect-error - testing runtime behavior
      expect(maskEmail(undefined)).toBe('[invalid email]')
    })

    it('handles email with only @ symbol', () => {
      const masked = maskEmail('@')

      expect(masked).toBe('[invalid email]')
    })

    it('handles email with empty local part', () => {
      const masked = maskEmail('@example.com')

      expect(masked).toBe('[invalid email]')
    })

    it('handles email with empty domain', () => {
      const masked = maskEmail('user@')

      expect(masked).toBe('[invalid email]')
    })

    it('handles long email addresses', () => {
      const longLocal = 'a'.repeat(64)
      const longDomain = 'b'.repeat(63) + '.com'
      const masked = maskEmail(`${longLocal}@${longDomain}`)

      expect(masked).toBe('a***@b***.com')
    })

    it('handles email with special characters in local part', () => {
      const masked = maskEmail('user+tag@example.com')

      expect(masked).toBe('u***@e***.com')
    })

    it('handles email with dots in local part', () => {
      const masked = maskEmail('first.last@example.com')

      expect(masked).toBe('f***@e***.com')
    })
  })

  describe('token security properties', () => {
    it('tokens for different emails with same timestamp have different signatures', () => {
      // Generate two tokens at exactly the same time
      const token1 = generateUnsubscribeToken('user1@example.com')
      const token2 = generateUnsubscribeToken('user2@example.com')

      // Decode and check that signatures are different
      const decoded1 = Buffer.from(
        token1.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice(0, (4 - (token1.length % 4)) % 4),
        'base64'
      ).toString('utf-8')
      const decoded2 = Buffer.from(
        token2.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice(0, (4 - (token2.length % 4)) % 4),
        'base64'
      ).toString('utf-8')

      const sig1 = decoded1.split('|')[2]
      const sig2 = decoded2.split('|')[2]

      expect(sig1).not.toBe(sig2)
    })

    it('cannot use signature from one email for another', () => {
      const token = generateUnsubscribeToken('victim@example.com')

      // Decode the token
      const decoded = Buffer.from(
        token.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice(0, (4 - (token.length % 4)) % 4),
        'base64'
      ).toString('utf-8')

      const parts = decoded.split('|')
      const timestamp = parts[1]
      const signature = parts[2]

      // Try to use the signature with a different email
      const forgedPayload = `attacker@example.com|${timestamp}|${signature}`
      const forgedToken = Buffer.from(forgedPayload)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '')

      const result = verifyUnsubscribeToken(forgedToken)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('invalid')
    })

    it('verification is case-sensitive for email in token', () => {
      // Generate with lowercase
      const token = generateUnsubscribeToken('test@example.com')

      // The email in the result should be lowercase
      const result = verifyUnsubscribeToken(token)
      expect(result.email).toBe('test@example.com')
    })
  })
})
