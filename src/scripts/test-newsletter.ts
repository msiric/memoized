// Test script for newsletter subscription
// Run with: npx tsx -r dotenv/config src/scripts/test-newsletter.ts dotenv_config_path=.env

import { Resend } from 'resend'

const RESEND_TOKEN = process.env.RESEND_TOKEN
const BLOG_AUDIENCE_ID = process.env.RESEND_BLOG_AUDIENCE_ID

async function testNewsletterSubscription() {
  console.log('=== Newsletter Subscription Test ===')
  console.log('')
  
  // Check environment variables
  console.log('1. Checking environment variables...')
  console.log(`   RESEND_TOKEN: ${RESEND_TOKEN ? '✓ Set (' + RESEND_TOKEN.substring(0, 10) + '...)' : '✗ NOT SET'}`)
  console.log(`   BLOG_AUDIENCE_ID: ${BLOG_AUDIENCE_ID ? '✓ Set (' + BLOG_AUDIENCE_ID + ')' : '✗ NOT SET'}`)
  console.log('')
  
  if (!RESEND_TOKEN) {
    console.error('ERROR: RESEND_TOKEN is not set!')
    process.exit(1)
  }
  
  const resend = new Resend(RESEND_TOKEN)
  
  // List audiences to find the correct ID
  console.log('2. Listing all audiences...')
  try {
    const { data: audiences, error: audError } = await resend.audiences.list()
    if (audError) {
      console.error('   ERROR listing audiences:', audError)
    } else {
      console.log('   Found audiences:')
      audiences?.data?.forEach((aud: { id: string; name: string }) => {
        console.log(`   - ${aud.name}: ${aud.id}`)
      })
    }
  } catch (err) {
    console.error('   ERROR:', err)
  }
  
  // Test creating a contact with audienceId (the old/correct way)
  console.log('')
  console.log('3. Testing contact creation with audienceId...')
  
  const testEmail = `test-${Date.now()}@example.com`
  console.log(`   Creating contact: ${testEmail}`)
  
  if (!BLOG_AUDIENCE_ID) {
    console.log('   Skipping - no audience ID set')
  } else {
    try {
      // Use audienceId parameter - this is what actually assigns to an audience
      const { data, error } = await resend.contacts.create({
        email: testEmail,
        unsubscribed: false,
        audienceId: BLOG_AUDIENCE_ID,
      })
      
      if (error) {
        console.error('   ERROR:', error)
      } else {
        console.log('   ✓ Contact created successfully!')
        console.log('   Response:', JSON.stringify(data, null, 2))
      }
    } catch (err) {
      console.error('   EXCEPTION:', err)
    }
  }
  
  console.log('')
  console.log('=== Test Complete ===')
}

testNewsletterSubscription()
