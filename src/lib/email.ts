import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000'
const FROM_EMAIL = process.env.EMAIL_FROM || 'Implant Registry <noreply@calledit.fun>'

export async function sendMagicLink(
  email: string, 
  token: string, 
  userType: 'dentist' | 'patient',
  patientId?: string
): Promise<void> {
  const magicLinkUrl = `${APP_URL}/api/auth/verify?token=${token}&type=${userType}`
  
  let subject: string
  let html: string
  
  if (userType === 'dentist') {
    subject = 'Sign in to Implant Registry'
    html = `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <h2 style="color: #4F46E5;">Implant Registry - Dentist Portal</h2>
        <p>Click the link below to sign in to your dentist account:</p>
        <p>
          <a href="${magicLinkUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
            Sign In
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">
          This link will expire in 10 minutes. If you didn't request this, please ignore this email.
        </p>
        <hr style="border: 1px solid #eee; margin: 24px 0;">
        <p style="color: #999; font-size: 12px;">
          Implant Registry MVP - Secure dental implant tracking
        </p>
      </div>
    `
  } else {
    subject = 'Access Your Implant Records'
    html = `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <h2 style="color: #059669;">Implant Registry - Patient Portal</h2>
        <p>Click the link below to access your implant records:</p>
        ${patientId ? `<p style="background-color: #f0f9ff; padding: 12px; border-radius: 8px; font-family: monospace;">
          Your Patient ID: <strong>${patientId}</strong>
        </p>` : ''}
        <p>
          <a href="${magicLinkUrl}" style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
            View My Records
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">
          This link will expire in 10 minutes. If you didn't request this, please ignore this email.
        </p>
        <hr style="border: 1px solid #eee; margin: 24px 0;">
        <p style="color: #999; font-size: 12px;">
          Implant Registry MVP - Secure dental implant tracking
        </p>
      </div>
    `
  }

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject,
    html
  })

  if (error) {
    console.error('Resend error:', error)
    throw new Error(`Failed to send email: ${error.message}`)
  }
}

export async function sendEmailVerification(
  email: string,
  dentistId: string,
  dentistName: string
): Promise<void> {
  const verificationUrl = `${APP_URL}/api/auth/verify-email?token=${dentistId}&type=dentist`
  
  const html = `
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
      <h2 style="color: #4F46E5;">Welcome to Implant Registry!</h2>
      <p>Hello Dr. ${dentistName},</p>
      <p>Thank you for registering with Implant Registry. Please verify your email address to activate your account:</p>
      <p>
        <a href="${verificationUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
          Verify Email Address
        </a>
      </p>
      <p style="color: #666; font-size: 14px;">
        This link will expire in 24 hours. If you didn't create this account, please ignore this email.
      </p>
      <hr style="border: 1px solid #eee; margin: 24px 0;">
      <p style="color: #999; font-size: 12px;">
        Implant Registry MVP - Secure dental implant tracking
      </p>
    </div>
  `

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: 'Verify your Implant Registry account',
    html
  })

  if (error) {
    console.error('Resend error:', error)
    throw new Error(`Failed to send verification email: ${error.message}`)
  }
}

export async function sendPatientSetupEmail(
  email: string,
  setupToken: string,
  patientId: string,
  dentistName: string,
  officeAddress: string
): Promise<void> {
  const setupUrl = `${APP_URL}/patient/setup?token=${setupToken}`
  
  const html = `
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
      <h2 style="color: #059669;">Welcome to Implant Registry</h2>
      <p>Hello,</p>
      <p>Dr. ${dentistName} from ${officeAddress} has created an Implant Registry account for you to securely access your dental implant records.</p>
      
      <div style="background-color: #f0f9ff; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p><strong>Your Patient ID:</strong> <span style="font-family: monospace; font-size: 16px;">${patientId}</span></p>
        <p style="color: #666; font-size: 14px;">Please save this ID - you'll need it to access your records.</p>
      </div>
      
      <p>To complete your account setup and view your records, please click the link below:</p>
      
      <p>
        <a href="${setupUrl}" style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
          Complete Account Setup
        </a>
      </p>
      
      <p style="color: #666; font-size: 14px;">
        This link will expire in 7 days. During setup, you'll need to confirm your name, date of birth, and email address.
      </p>
      
      <hr style="border: 1px solid #eee; margin: 24px 0;">
      <p style="color: #999; font-size: 12px;">
        Implant Registry - Secure dental implant tracking
      </p>
    </div>
  `

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: 'Your Implant Registry Account - Action Required',
    html
  })

  if (error) {
    console.error('Resend error:', error)
    throw new Error(`Failed to send setup email: ${error.message}`)
  }
}

export async function sendImplantNotification(
  patientEmail: string,
  patientId: string,
  dentistName: string,
  implantDetails: any
): Promise<void> {
  const patientPortalUrl = `${APP_URL}/patient`
  
  const html = `
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
      <h2 style="color: #059669;">New Implant Record Added</h2>
      <p>Hello,</p>
      <p>A new implant record has been added to your medical history by <strong>${dentistName}</strong>.</p>
      
      <div style="background-color: #f0f9ff; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p><strong>Date:</strong> ${implantDetails.placementDate || implantDetails.removalDate}</p>
        <p><strong>Location:</strong> ${implantDetails.location}</p>
        <p><strong>Type:</strong> ${implantDetails.placementDate ? 'Implant Placement' : 'Implant Removal'}</p>
      </div>
      
      <p style="background-color: #f0f9ff; padding: 12px; border-radius: 8px; font-family: monospace;">
        Your Patient ID: <strong>${patientId}</strong>
      </p>
      
      <p>
        <a href="${patientPortalUrl}" style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
          View Full Records
        </a>
      </p>
      
      <hr style="border: 1px solid #eee; margin: 24px 0;">
      <p style="color: #999; font-size: 12px;">
        Implant Registry MVP - Secure dental implant tracking
      </p>
    </div>
  `

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: patientEmail,
    subject: 'New Implant Record Added to Your File',
    html
  })

  if (error) {
    console.error('Resend error:', error)
    // Don't throw for notifications - they're not critical
  }
}

export async function sendRecordAccessNotification(
  patientEmail: string,
  patientId: string,
  dentistName: string,
  accessType: string
): Promise<void> {
  const patientPortalUrl = `${APP_URL}/patient`
  
  const accessTypeDescription = accessType === 'PATIENT_RECORDS_VIEW' 
    ? 'viewed your complete implant history'
    : 'searched your patient records'
  
  const html = `
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
      <h2 style="color: #059669;">Your Records Were Accessed</h2>
      <p>Hello,</p>
      <p><strong>Dr. ${dentistName}</strong> has ${accessTypeDescription}.</p>
      
      <div style="background-color: #f0f9ff; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p><strong>Date & Time:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>Action:</strong> ${accessTypeDescription}</p>
        <p><strong>Healthcare Provider:</strong> Dr. ${dentistName}</p>
      </div>
      
      <p style="background-color: #f0f9ff; padding: 12px; border-radius: 8px; font-family: monospace;">
        Your Patient ID: <strong>${patientId}</strong>
      </p>
      
      <p>This access has been securely logged and recorded on the blockchain for your security.</p>
      
      <p>
        <a href="${patientPortalUrl}" style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
          View Access Log
        </a>
      </p>
      
      <p style="color: #666; font-size: 14px;">
        If you have questions about this access, please contact Dr. ${dentistName} directly.
      </p>
      
      <hr style="border: 1px solid #eee; margin: 24px 0;">
      <p style="color: #999; font-size: 12px;">
        Implant Registry MVP - Secure dental implant tracking
      </p>
    </div>
  `

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: patientEmail,
    subject: `Your Records Were Accessed by Dr. ${dentistName}`,
    html
  })

  if (error) {
    console.error('Resend error:', error)
    // Don't throw for notifications - they're not critical
  }
}