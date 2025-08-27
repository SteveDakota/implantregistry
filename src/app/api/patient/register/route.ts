import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { hashEmail, generateSearchHash, generatePatientId, generateVerificationHash } from '@/lib/crypto'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, dob, email } = body

    if (!name || !dob || !email) {
      return NextResponse.json({ 
        error: 'Name, date of birth, and email are required' 
      }, { status: 400 })
    }

    const emailHash = hashEmail(email)
    const searchHash = generateSearchHash(name, dob, email)
    
    // Check if patient already exists
    const existingPatient = await query(
      'SELECT patient_id FROM patients WHERE search_hash = $1',
      [searchHash]
    )

    if (existingPatient.rows.length > 0) {
      return NextResponse.json({ 
        error: 'Patient record already exists with these details' 
      }, { status: 409 })
    }

    // Generate unique patient ID
    const patientId = generatePatientId()
    const verificationHash = generateVerificationHash(patientId, emailHash)

    // Create patient record
    await query(
      `INSERT INTO patients (patient_id, email_hash, search_hash, verification_hash, created_at) 
       VALUES ($1, $2, $3, $4, NOW())`,
      [patientId, emailHash, searchHash, verificationHash]
    )

    // Log audit entry
    await query(
      `INSERT INTO audit_logs (patient_id, action, metadata, ip_address, user_agent) 
       VALUES ($1, $2, $3, $4, $5)`,
      [
        patientId,
        'PATIENT_REGISTRATION',
        JSON.stringify({ 
          registrationMethod: 'self_register',
          timestamp: Date.now()
        }),
        request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        request.headers.get('user-agent') || 'unknown'
      ]
    )

    return NextResponse.json({ 
      success: true,
      message: 'Patient registered successfully',
      patientId,
      instructions: 'Please save your Patient ID safely. You will need it to access your records.'
    })

  } catch (error) {
    console.error('Patient registration error:', error)
    return NextResponse.json({ 
      error: 'Failed to register patient' 
    }, { status: 500 })
  }
}