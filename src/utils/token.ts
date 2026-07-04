import { createHmac } from 'crypto'

/**
 * Newsletter Token Utility
 * 
 * Creates cryptographically signed tokens for secure unsubscribe links.
 * This prevents:
 * - URL manipulation to unsubscribe other users
 * - Email enumeration attacks
 * - Log injection attacks
 * 
 * Token format: base64url(email + "|" + timestamp + "|" + signature)
 * Note: Using "|" as delimiter since it's not valid in emails (RFC 5321)
 */

// Secret for signing tokens - MUST be set in production
const TOKEN_SECRET = process.env.NEWSLETTER_TOKEN_SECRET || process.env.RESEND_TOKEN || ''

// Token validity period (30 days in milliseconds)
const TOKEN_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000

// Maximum allowed clock skew (5 minutes in the future)
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000

// Delimiter for token parts - using "|" since it's not valid in email addresses
const TOKEN_DELIMITER = '|'

/**
 * Base64URL encode (URL-safe base64)
 */
function base64UrlEncode(str: string): string {
  return Buffer.from(str, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

/**
 * Base64URL decode
 */
function base64UrlDecode(str: string): string {
  // Add padding back
  const padded = str + '==='.slice(0, (4 - (str.length % 4)) % 4)
  return Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8')
}

/**
 * Create HMAC signature for the payload
 */
function createSignature(payload: string): string {
  if (!TOKEN_SECRET) {
    // In production, this should never happen - log error but don't crash
    console.error('[Newsletter Token] CRITICAL: No TOKEN_SECRET configured - tokens will be insecure!')
  }
  return createHmac('sha256', TOKEN_SECRET || 'insecure-fallback-do-not-use-in-production')
    .update(payload)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

/**
 * Verify HMAC signature using timing-safe comparison
 */
function verifySignature(payload: string, signature: string): boolean {
  const expectedSignature = createSignature(payload)
  
  // Timing-safe comparison to prevent timing attacks
  if (signature.length !== expectedSignature.length) {
    return false
  }
  
  let result = 0
  for (let i = 0; i < signature.length; i++) {
    result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i)
  }
  return result === 0
}

/**
 * Generate a secure unsubscribe token for an email address
 * 
 * @param email - The email address to create a token for
 * @returns A URL-safe token string
 */
export function generateUnsubscribeToken(email: string): string {
  const normalizedEmail = email.toLowerCase().trim()
  const timestamp = Date.now().toString()
  const payload = `${normalizedEmail}${TOKEN_DELIMITER}${timestamp}`
  const signature = createSignature(payload)
  
  // Encode the entire token as base64url
  const token = base64UrlEncode(`${payload}${TOKEN_DELIMITER}${signature}`)
  
  return token
}

/**
 * Verify and decode an unsubscribe token
 * 
 * @param token - The token to verify
 * @returns The email address if valid, null if invalid or expired
 */
export function verifyUnsubscribeToken(token: string): { 
  valid: boolean
  email: string | null
  error?: 'invalid' | 'expired' | 'malformed'
} {
  try {
    // Decode the token
    const decoded = base64UrlDecode(token)
    const parts = decoded.split(TOKEN_DELIMITER)
    
    if (parts.length !== 3) {
      return { valid: false, email: null, error: 'malformed' }
    }
    
    const [email, timestampStr, signature] = parts
    const timestamp = parseInt(timestampStr, 10)
    
    // Validate timestamp is a number
    if (isNaN(timestamp)) {
      return { valid: false, email: null, error: 'malformed' }
    }
    
    const now = Date.now()
    
    // Check for future timestamps (clock skew attack prevention)
    if (timestamp > now + MAX_CLOCK_SKEW_MS) {
      return { valid: false, email: null, error: 'invalid' }
    }
    
    // Check expiry
    if (now - timestamp > TOKEN_EXPIRY_MS) {
      return { valid: false, email: null, error: 'expired' }
    }
    
    // Verify signature
    const payload = `${email}${TOKEN_DELIMITER}${timestampStr}`
    if (!verifySignature(payload, signature)) {
      return { valid: false, email: null, error: 'invalid' }
    }
    
    // Validate email format (basic check)
    if (!email || !email.includes('@') || email.length > 254) {
      return { valid: false, email: null, error: 'malformed' }
    }
    
    return { valid: true, email }
  } catch {
    return { valid: false, email: null, error: 'malformed' }
  }
}

/**
 * Mask an email for safe logging
 * e.g., "test@example.com" -> "t***@e***.com"
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) {
    return '[invalid email]'
  }
  
  const [localPart, domain] = email.split('@')
  
  // Handle edge cases
  if (!localPart || !domain) {
    return '[invalid email]'
  }
  
  const domainParts = domain.split('.')
  
  const maskedLocal = localPart.length > 1 
    ? localPart[0] + '***' 
    : '***'
  
  // Handle domains with and without TLD (e.g., localhost in testing)
  const maskedDomain = domainParts.length > 1 && domainParts[0].length > 0
    ? domainParts[0][0] + '***.' + domainParts.slice(1).join('.')
    : domain.length > 1 ? domain[0] + '***' : '***'
  
  return `${maskedLocal}@${maskedDomain}`
}
