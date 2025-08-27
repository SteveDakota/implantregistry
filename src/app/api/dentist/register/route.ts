import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { hashEmail, hashPassword } from '@/lib/crypto'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, name, licenseId, officeAddress, password, toothNotationPreference } = body

    if (!email || !name || !licenseId || !officeAddress || !password || !toothNotationPreference) {
      return NextResponse.json({ 
        error: 'All fields required: email, name, licenseId, officeAddress, password, toothNotationPreference' 
      }, { status: 400 })
    }

    if (!['universal', 'iso'].includes(toothNotationPreference)) {
      return NextResponse.json({ 
        error: 'Tooth notation preference must be "universal" or "iso"' 
      }, { status: 400 })
    }

    const emailHash = hashEmail(email)
    const passwordHash = await hashPassword(password)

    // Check if dentist already exists
    const existingDentist = await query(
      'SELECT id FROM dentists WHERE email_hash = $1',
      [emailHash]
    )

    if (existingDentist.rows.length > 0) {
      return NextResponse.json({ 
        error: 'Dentist account already exists with this email' 
      }, { status: 409 })
    }

    // Create dentist account (inactive until email verified)
    const result = await query(
      `INSERT INTO dentists (email, email_hash, password_hash, name, license_id, office_address, tooth_notation_preference, active, email_verified) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, false, false) 
       RETURNING id`,
      [email, emailHash, passwordHash, name, licenseId, officeAddress, toothNotationPreference]
    )

    const dentistId = result.rows[0].id

    // Send verification email
    const { sendEmailVerification } = await import('@/lib/email')
    await sendEmailVerification(email, dentistId.toString(), name)

    // Log audit entry
    await query(
      `INSERT INTO audit_logs (dentist_id, action, metadata, ip_address, user_agent) 
       VALUES ($1, $2, $3, $4, $5)`,
      [
        dentistId,
        'DENTIST_REGISTRATION',
        JSON.stringify({ email, name, licenseId }),
        request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        request.headers.get('user-agent') || 'unknown'
      ]
    )

    return NextResponse.json({ 
      success: true,
      message: 'Registration successful! Please check your email and click the verification link to activate your account. You cannot sign in until your email is verified.',
      dentistId
    })

  } catch (error) {
    console.error('Dentist registration error:', error)
    return NextResponse.json({ 
      error: 'Failed to create dentist account' 
    }, { status: 500 })
  }
}