/**
 * Shared validation utilities
 */

// RFC 5322 compliant email regex
// Used by both frontend (NewsletterCTA) and backend (newsletter routes)
export const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/

// Maximum email length per RFC 5321
export const MAX_EMAIL_LENGTH = 254

/**
 * Validates an email address
 * @param email - The email to validate
 * @returns true if valid, false otherwise
 */
export function isValidEmail(email: string): boolean {
  const trimmed = email.trim()
  return trimmed.length <= MAX_EMAIL_LENGTH && EMAIL_REGEX.test(trimmed)
}
