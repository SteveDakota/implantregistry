// Setup Ethereal Email for testing
const nodemailer = require('nodemailer')

const setupEmail = async () => {
  console.log('🔧 Setting up Ethereal Email for testing...')
  
  try {
    // Generate test account
    const testAccount = await nodemailer.createTestAccount()
    
    console.log('✅ Ethereal Email account created!')
    console.log('')
    console.log('📧 Email Configuration:')
    console.log('Add these to your .env.local file:')
    console.log('')
    console.log(`EMAIL_SERVER_HOST="smtp.ethereal.email"`)
    console.log(`EMAIL_SERVER_PORT="587"`)
    console.log(`EMAIL_SERVER_USER="${testAccount.user}"`)
    console.log(`EMAIL_SERVER_PASSWORD="${testAccount.pass}"`)
    console.log(`EMAIL_FROM="noreply@implant-registry.local"`)
    console.log('')
    console.log('🌐 View emails at: https://ethereal.email/')
    console.log(`📧 Login with: ${testAccount.user} / ${testAccount.pass}`)
    
  } catch (error) {
    console.error('❌ Failed to setup email:', error)
  }
}

setupEmail()