/**
 * Resend Client
 *
 * Thin wrapper around the Resend SDK.
 * Business logic (templates, sending) is in services/email.ts.
 */

import { Resend } from 'resend'

const RESEND_TOKEN = process.env.RESEND_TOKEN ?? ''

/**
 * Shared Resend client instance.
 * Use this instead of creating new Resend instances in API routes.
 */
export const resend = new Resend(RESEND_TOKEN)
