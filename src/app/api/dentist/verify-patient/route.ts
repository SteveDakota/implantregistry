import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { hashEmail, generateVerificationHash } from '@/lib/crypto'
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
    const { patientId, email } = body

    if (!patientId || !email) {
      return NextResponse.json({ 
        error: 'Patient ID and email are required' 
      }, { status: 400 })
    }

    // Generate verification hashes (both new and old methods for compatibility)
    const emailHash = hashEmail(email)
    const newVerificationHash = generateVerificationHash(patientId, emailHash)
    // Old method used direct concatenation, not the hashEmail function
    const oldVerificationHash = require('crypto').createHash('sha256').update(patientId + email).digest('hex')

    // Verify against database
    const result = await query(
      'SELECT patient_id, verification_hash, created_at FROM patients WHERE patient_id = $1',
      [patientId]
    )

    if (result.rows.length === 0) {
      // Log failed verification attempt
      await query(
        `INSERT INTO audit_logs (dentist_id, patient_id, action, metadata, ip_address, user_agent) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          dentistData.id,
          patientId,
          'PATIENT_VERIFICATION_FAILED',
          JSON.stringify({ 
            reason: 'patient_id_not_found',
            timestamp: Date.now()
          }),
          request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          request.headers.get('user-agent') || 'unknown'
        ]
      )

      return NextResponse.json({
        verified: false,
        message: 'Invalid Patient ID.'
      }, { status: 404 })
    }

    const patientRecord = result.rows[0]
    
    // Check both new and old verification methods
    if (patientRecord.verification_hash !== newVerificationHash && patientRecord.verification_hash !== oldVerificationHash) {
      // Log failed verification attempt
      await query(
        `INSERT INTO audit_logs (dentist_id, patient_id, action, metadata, ip_address, user_agent) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          dentistData.id,
          patientId,
          'PATIENT_VERIFICATION_FAILED',
          JSON.stringify({ 
            reason: 'verification_hash_mismatch',
            timestamp: Date.now()
          }),
          request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          request.headers.get('user-agent') || 'unknown'
        ]
      )

      return NextResponse.json({
        verified: false,
        message: 'Invalid Patient ID and email combination.'
      }, { status: 403 })
    }

    // Successful verification - log audit entry
    await query(
      `INSERT INTO audit_logs (dentist_id, patient_id, action, metadata, ip_address, user_agent) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        dentistData.id,
        patientId,
        'PATIENT_VERIFICATION_SUCCESS',
        JSON.stringify({ 
          timestamp: Date.now()
        }),
        request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        request.headers.get('user-agent') || 'unknown'
      ]
    )

    return NextResponse.json({
      verified: true,
      message: 'Patient verified successfully.',
      patientId: patientRecord.patient_id,
      registeredDate: patientRecord.created_at
    })

  } catch (error) {
    console.error('Patient verification error:', error)
    return NextResponse.json({ 
      error: 'Failed to verify patient' 
    }, { status: 500 })
  }
}