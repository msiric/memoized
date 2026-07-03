/**
 * Email Service
 *
 * Business logic for sending emails. Uses the Resend client from lib/resend.ts.
 * Contains email templates and sending functions.
 */

import { APP_NAME, COURSES_PREFIX, INFO_EMAIL } from '@/constants'
import { ServiceError } from '@/lib/sentry'
import { resend } from '@/lib/resend'
import { generateUnsubscribeToken } from '@/utils/token'

// Production URL for assets (logo) - email clients can't access localhost
const PROD_URL = 'https://www.memoized.io'
// Current environment URL for links - allows testing locally
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || PROD_URL
const LOGO_PATH = `${PROD_URL}/images/brand/logo-dark.png`

// ============================================================================
// Email Templates
// ============================================================================

const WelcomeEmail = (name: string | null) => {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
  <html dir="ltr" lang="en">
    <head>
      <meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
      <meta name="x-apple-disable-message-reformatting" />
    </head>
    <body style="background-color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,&quot;Segoe UI&quot;,Roboto,Oxygen-Sans,Ubuntu,Cantarell,&quot;Helvetica Neue&quot;,sans-serif">
      <table align="center" width="100%" border="0" cellPadding="0" cellSpacing="0" role="presentation" style="max-width:37.5em;margin:0 auto;padding:20px 0 48px">
        <tbody>
          <tr style="width:100%">
            <td>
              <img alt="Logo" height="30" src="${LOGO_PATH}" style="display:block;outline:none;border:none;text-decoration:none;margin:10px auto" />
              <p style="font-size:16px;line-height:26px;margin:16px 0">Hi ${name ?? 'there'},</p>
              <p style="font-size:16px;line-height:26px;margin:16px 0">Welcome to ${APP_NAME}, the premier platform for mastering data structures and algorithms in JavaScript and TypeScript.</p>
              <p style="font-size:16px;line-height:26px;margin:16px 0">I'm honored you chose to join the platform, and I hope you'll make the best use of it.</p>
              <table align="center" width="100%" border="0" cellPadding="0" cellSpacing="0" role="presentation" style="text-align:center">
                <tbody>
                  <tr>
                    <td><a href="${BASE_URL}${COURSES_PREFIX}" style="line-height:100%;text-decoration:none;display:block;max-width:100%;background-color:#84cc16;border-radius:15px;color:#fff;font-size:16px;text-align:center;padding:12px 12px 12px 12px" target="_blank"><span><!--[if mso]><i style="letter-spacing: 12px;mso-font-width:-100%;mso-text-raise:18" hidden>&nbsp;</i><![endif]--></span><span style="max-width:100%;display:inline-block;line-height:120%;mso-padding-alt:0px;mso-text-raise:9px">Explore content</span><span><!--[if mso]><i style="letter-spacing: 12px;mso-font-width:-100%" hidden>&nbsp;</i><![endif]--></span></a></td>
                  </tr>
                </tbody>
              </table>
              <p style="font-size:16px;line-height:26px;margin:16px 0">Best,<br />Mario from ${APP_NAME}</p>
              <hr style="width:100%;border:none;border-top:1px solid #eaeaea;border-color:#cccccc;margin:20px 0" />
              <p style="font-size:12px;line-height:24px;margin:16px 0;color:#8898aa">&copy; Copyright ${new Date().getFullYear()}. All rights reserved.</p>
            </td>
          </tr>
        </tbody>
      </table>
    </body>
  </html>`
}

const SubscriptionEmail = (name: string | null) => {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
  <html dir="ltr" lang="en">
    <head>
      <meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
      <meta name="x-apple-disable-message-reformatting" />
    </head>
    <body style="background-color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,&quot;Segoe UI&quot;,Roboto,Oxygen-Sans,Ubuntu,Cantarell,&quot;Helvetica Neue&quot;,sans-serif">
      <table align="center" width="100%" border="0" cellPadding="0" cellSpacing="0" role="presentation" style="max-width:37.5em;margin:0 auto;padding:20px 0 48px">
        <tbody>
          <tr style="width:100%">
            <td>
              <img alt="Logo" height="30" src="${LOGO_PATH}" style="display:block;outline:none;border:none;text-decoration:none;margin:10px auto" />
              <p style="font-size:16px;line-height:26px;margin:16px 0">Hi ${name ?? 'there'},</p>
              <p style="font-size:16px;line-height:26px;margin:16px 0">Thank you for upgrading to the premium subscription of ${APP_NAME}! I'm honored to have you on board as a valued premium member.</p>
              <p style="font-size:16px;line-height:26px;margin:16px 0">With your premium subscription, you now have access to exclusive content and features to enhance your learning experience in JavaScript and TypeScript data structures and algorithms.</p>
              <table align="center" width="100%" border="0" cellPadding="0" cellSpacing="0" role="presentation" style="text-align:center">
                <tbody>
                  <tr>
                    <td><a href="https://discord.gg/BECQFfS3" style="line-height:100%;text-decoration:none;display:block;max-width:100%;background-color:#84cc16;border-radius:15px;color:#fff;font-size:16px;text-align:center;padding:12px 12px 12px 12px" target="_blank"><span><!--[if mso]><i style="letter-spacing: 12px;mso-font-width:-100%;mso-text-raise:18" hidden>&nbsp;</i><![endif]--></span><span style="max-width:100%;display:inline-block;line-height:120%;mso-padding-alt:0px;mso-text-raise:9px">Join private Discord</span><span><!--[if mso]><i style="letter-spacing: 12px;mso-font-width:-100%" hidden>&nbsp;</i><![endif]--></span></a></td>
                  </tr>
                </tbody>
              </table>
              <p style="font-size:16px;line-height:26px;margin:16px 0">Here are some highlights of your premium subscription benefits:</p>
              <ul style="font-size:16px;line-height:26px;margin:16px 0">
                <li>Access to all current and future premium content</li>
                <li>Free updates and new features as they're released</li>
                <li>Priority support</li>
              </ul>
              <p style="font-size:16px;line-height:26px;margin:16px 0">If you have any questions about your premium subscription or need assistance, please don't hesitate to reach out.</p>
              <p style="font-size:16px;line-height:26px;margin:16px 0">Happy coding!</p>
              <p style="font-size:16px;line-height:26px;margin:16px 0">Best,<br />Mario from ${APP_NAME}</p>
              <hr style="width:100%;border:none;border-top:1px solid #eaeaea;border-color:#cccccc;margin:20px 0" />
              <p style="font-size:12px;line-height:24px;margin:16px 0;color:#8898aa">&copy; Copyright ${new Date().getFullYear()}. All rights reserved.</p>
            </td>
          </tr>
        </tbody>
      </table>
    </body>
  </html>`
}

const PurchaseEmail = (name: string | null) => {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
  <html dir="ltr" lang="en">
    <head>
      <meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
      <meta name="x-apple-disable-message-reformatting" />
    </head>
    <body style="background-color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,&quot;Segoe UI&quot;,Roboto,Oxygen-Sans,Ubuntu,Cantarell,&quot;Helvetica Neue&quot;,sans-serif">
      <table align="center" width="100%" border="0" cellPadding="0" cellSpacing="0" role="presentation" style="max-width:37.5em;margin:0 auto;padding:20px 0 48px">
        <tbody>
          <tr style="width:100%">
            <td>
              <img alt="Logo" height="30" src="${LOGO_PATH}" style="display:block;outline:none;border:none;text-decoration:none;margin:10px auto" />
              <p style="font-size:16px;line-height:26px;margin:16px 0">Hi ${name ?? 'there'},</p>
              <p style="font-size:16px;line-height:26px;margin:16px 0">Thank you for purchasing lifetime access to ${APP_NAME}! I'm thrilled to welcome you as a permanent member of our premium community.</p>
              <p style="font-size:16px;line-height:26px;margin:16px 0">With your lifetime access, you now have unlimited, ongoing access to all the premium content and features. This includes current and future resources to enhance your learning experience in JavaScript and TypeScript data structures and algorithms.</p>
              <table align="center" width="100%" border="0" cellPadding="0" cellSpacing="0" role="presentation" style="text-align:center">
                <tbody>
                  <tr>
                    <td><a href="https://discord.gg/BECQFfS3" style="line-height:100%;text-decoration:none;display:block;max-width:100%;background-color:#84cc16;border-radius:15px;color:#fff;font-size:16px;text-align:center;padding:12px 12px 12px 12px" target="_blank"><span><!--[if mso]><i style="letter-spacing: 12px;mso-font-width:-100%;mso-text-raise:18" hidden>&nbsp;</i><![endif]--></span><span style="max-width:100%;display:inline-block;line-height:120%;mso-padding-alt:0px;mso-text-raise:9px">Join private Discord</span><span><!--[if mso]><i style="letter-spacing: 12px;mso-font-width:-100%" hidden>&nbsp;</i><![endif]--></span></a></td>
                  </tr>
                </tbody>
              </table>
              <p style="font-size:16px;line-height:26px;margin:16px 0">Here are some highlights of your lifetime access benefits:</p>
              <ul style="font-size:16px;line-height:26px;margin:16px 0">
                <li>Unlimited access to all current and future premium content</li>
                <li>Free updates and new features as they're released</li>
                <li>Exclusive lifetime member community</li>
                <li>Priority support for life</li>
              </ul>
              <p style="font-size:16px;line-height:26px;margin:16px 0">If you have any questions about your lifetime access or need assistance at any point, please don't hesitate to reach out. I'm here to support you throughout your learning journey.</p>
              <p style="font-size:16px;line-height:26px;margin:16px 0">As a lifetime member, you have the unique opportunity to shape the future of ${APP_NAME}. You can directly contribute to platform improvements and suggest new content ideas by reaching out to me personally. Your input is invaluable in making ${APP_NAME} even better for everyone. I'm looking forward to hearing your ideas.</p>
              <p style="font-size:16px;line-height:26px;margin:16px 0">Happy coding, and welcome to the ${APP_NAME} family for life!</p>
              <p style="font-size:16px;line-height:26px;margin:16px 0">Best,<br />Mario from ${APP_NAME}</p>
              <hr style="width:100%;border:none;border-top:1px solid #eaeaea;border-color:#cccccc;margin:20px 0" />
              <p style="font-size:12px;line-height:24px;margin:16px 0;color:#8898aa">&copy; Copyright ${new Date().getFullYear()}. All rights reserved.</p>
            </td>
          </tr>
        </tbody>
      </table>
    </body>
  </html>`
}

const NewsletterWelcomeEmail = (email: string) => {
  // Generate a secure, signed token for the unsubscribe link
  const token = generateUnsubscribeToken(email)
  const unsubscribeUrl = `${BASE_URL}/api/newsletter/unsubscribe?token=${token}`
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
  <html dir="ltr" lang="en">
    <head>
      <meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
      <meta name="x-apple-disable-message-reformatting" />
    </head>
    <body style="background-color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,&quot;Segoe UI&quot;,Roboto,Oxygen-Sans,Ubuntu,Cantarell,&quot;Helvetica Neue&quot;,sans-serif">
      <table align="center" width="100%" border="0" cellPadding="0" cellSpacing="0" role="presentation" style="max-width:37.5em;margin:0 auto;padding:20px 0 48px">
        <tbody>
          <tr style="width:100%">
            <td>
              <img alt="Logo" height="30" src="${LOGO_PATH}" style="display:block;outline:none;border:none;text-decoration:none;margin:10px auto" />
              <p style="font-size:16px;line-height:26px;margin:16px 0">Hey there!</p>
              <p style="font-size:16px;line-height:26px;margin:16px 0">Thanks for subscribing to the ${APP_NAME} blog newsletter! I'm excited to have you on board.</p>
              <p style="font-size:16px;line-height:26px;margin:16px 0">You'll receive updates whenever I publish new articles about JavaScript, TypeScript, data structures, algorithms and software engineering best practices.</p>
              <table align="center" width="100%" border="0" cellPadding="0" cellSpacing="0" role="presentation" style="text-align:center">
                <tbody>
                  <tr>
                    <td><a href="${BASE_URL}/blog" style="line-height:100%;text-decoration:none;display:block;max-width:100%;background-color:#84cc16;border-radius:15px;color:#fff;font-size:16px;text-align:center;padding:12px 12px 12px 12px" target="_blank"><span><!--[if mso]><i style="letter-spacing: 12px;mso-font-width:-100%;mso-text-raise:18" hidden>&nbsp;</i><![endif]--></span><span style="max-width:100%;display:inline-block;line-height:120%;mso-padding-alt:0px;mso-text-raise:9px">Read the blog</span><span><!--[if mso]><i style="letter-spacing: 12px;mso-font-width:-100%" hidden>&nbsp;</i><![endif]--></span></a></td>
                  </tr>
                </tbody>
              </table>
              <p style="font-size:16px;line-height:26px;margin:16px 0">Best,<br />Mario from ${APP_NAME}</p>
              <hr style="width:100%;border:none;border-top:1px solid #eaeaea;border-color:#cccccc;margin:20px 0" />
              <p style="font-size:12px;line-height:24px;margin:16px 0;color:#8898aa">&copy; Copyright ${new Date().getFullYear()}. All rights reserved.</p>
              <p style="font-size:12px;line-height:24px;margin:16px 0;color:#8898aa">You received this email because you subscribed to the ${APP_NAME} newsletter. <a href="${unsubscribeUrl}" style="color:#8898aa">Unsubscribe</a></p>
            </td>
          </tr>
        </tbody>
      </table>
    </body>
  </html>`
}

// ============================================================================
// Email Type Configuration
// ============================================================================

const emailTypeToContent = {
  welcome: {
    subject: `Welcome to ${APP_NAME}`,
    renderContent: WelcomeEmail,
  },
  subscription: {
    subject: `Thank you for subscribing to premium`,
    renderContent: SubscriptionEmail,
  },
  purchase: {
    subject: `Thank you for purchasing lifetime access`,
    renderContent: PurchaseEmail,
  },
}

// ============================================================================
// Email Sending Functions
// ============================================================================

export type SendEmailArgs = {
  from?: string
  to: string
  type: 'welcome' | 'subscription' | 'purchase'
  name: string
  idempotencyKey?: string
}

export async function sendEmail({
  from = INFO_EMAIL,
  to,
  type,
  name,
  idempotencyKey,
}: SendEmailArgs) {
  const { subject, renderContent } = emailTypeToContent[type]

  const html = renderContent(name)

  try {
    await resend.emails.send(
      {
        from,
        to,
        subject,
        html,
      },
      idempotencyKey ? { idempotencyKey } : undefined,
    )
  } catch (_error) {
    throw new ServiceError(`Failed to send email`)
  }
}

export async function sendNewsletterWelcome(email: string) {
  try {
    await resend.emails.send({
      from: INFO_EMAIL,
      to: email,
      subject: `Welcome to the ${APP_NAME} Newsletter!`,
      html: NewsletterWelcomeEmail(email),
    })
    return { success: true }
  } catch (error) {
    console.error('[Newsletter] Failed to send welcome email:', error)
    return { success: false, error }
  }
}
