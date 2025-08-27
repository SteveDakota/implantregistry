import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { hashEmail, generatePatientId } from '@/lib/crypto'
import { jwtVerify } from 'jose'

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key'
const secret = new TextEncoder().encode(JWT_SECRET)

export async function POST(request: NextRequest) {
  try {
    // Verify dentist authentication
    const authToken = request.cookies.get('auth-token')?.value
    if (!authToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    let dentistData
    try {
      const { payload } = await jwtVerify(authToken, secret)
      dentistData = payload as any
      if (dentistData.userType !== 'dentist') {
        throw new Error('Invalid user type')
      }
    } catch (error) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 })
    }

    const body = await request.json()
    const { searchHash, name, dob, email } = body

    if (!searchHash || !name || !dob || !email) {
      return NextResponse.json({ 
        error: 'All fields required: searchHash, name, dob, email' 
      }, { status: 400 })
    }

    // Check if patient already exists
    const existingPatient = await query(
      'SELECT patient_id FROM patients WHERE search_hash = $1',
      [searchHash]
    )

    if (existingPatient.rows.length > 0) {
      return NextResponse.json({ 
        error: 'Patient already exists with these identifiers' 
      }, { status: 409 })
    }

    // Get dentist info for email
    const dentistInfo = await query(
      'SELECT name, office_address FROM dentists WHERE id = $1',
      [dentistData.id]
    )

    const dentistName = dentistInfo.rows[0]?.name || 'Your dentist'
    const officeAddress = dentistInfo.rows[0]?.office_address || ''

    // Generate patient ID and verification hash
    const patientId = generatePatientId()
    const emailHash = hashEmail(email)
    // Use consistent verification hash generation
    const { generateVerificationHash } = await import('@/lib/crypto')
    const verificationHash = generateVerificationHash(patientId, emailHash)

    // Create patient account (not activated until they complete setup)
    const result = await query(
      `INSERT INTO patients (patient_id, email_hash, search_hash, verification_hash, created_by_dentist_id, activated) 
       VALUES ($1, $2, $3, $4, $5, false) 
       RETURNING patient_id, created_at`,
      [patientId, emailHash, searchHash, verificationHash, dentistData.id]
    )

    // Generate setup token (using patient_id + timestamp for uniqueness)
    const setupToken = Buffer.from(`${patientId}:${Date.now()}`).toString('base64')
    
    // Store setup token temporarily
    await query(
      `INSERT INTO patient_setup_tokens (patient_id, token, email, name, dob, expires_at) 
       VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '7 days')`,
      [patientId, setupToken, email, name, dob]
    )

    // Send setup email to patient
    const { sendPatientSetupEmail } = await import('@/lib/email')
    await sendPatientSetupEmail(
      email,
      setupToken,
      patientId,
      dentistName,
      officeAddress
    )

    // Log audit entry
    await query(
      `INSERT INTO audit_logs (dentist_id, patient_id, action, metadata, ip_address, user_agent) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        dentistData.id,
        patientId,
        'PATIENT_ACCOUNT_CREATED',
        JSON.stringify({ 
          patientId,
          email,
          createdBy: dentistName,
          timestamp: Date.now()
        }),
        request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        request.headers.get('user-agent') || 'unknown'
      ]
    )

    return NextResponse.json({ 
      success: true,
      message: `Patient account created successfully. An email has been sent to ${email} to complete account setup.`,
      patientId,
      createdAt: result.rows[0].created_at
    })

  } catch (error) {
    console.error('Create patient error:', error)
    return NextResponse.json({ 
      error: 'Failed to create patient account' 
    }, { status: 500 })
  }
}