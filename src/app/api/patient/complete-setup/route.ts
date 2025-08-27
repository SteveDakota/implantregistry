import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { generateSearchHash } from '@/lib/crypto'
import { SignJWT } from 'jose'

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key'
const secret = new TextEncoder().encode(JWT_SECRET)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, name, dob, email } = body

    if (!token || !name || !dob || !email) {
      return NextResponse.json({ 
        error: 'All fields are required' 
      }, { status: 400 })
    }

    // Verify setup token exists and is not expired
    const tokenResult = await query(
      `SELECT patient_id, email, name, dob 
       FROM patient_setup_tokens 
       WHERE token = $1 AND expires_at > NOW()`,
      [token]
    )

    if (tokenResult.rows.length === 0) {
      return NextResponse.json({ 
        error: 'Invalid or expired setup link. Please contact your dentist.' 
      }, { status: 400 })
    }

    const setupData = tokenResult.rows[0]
    const patientId = setupData.patient_id

    // Generate search hash from provided data
    const providedSearchHash = generateSearchHash(name, dob, email)

    // Get the patient's search hash from database
    const patientResult = await query(
      'SELECT search_hash FROM patients WHERE patient_id = $1',
      [patientId]
    )

    if (patientResult.rows.length === 0) {
      return NextResponse.json({ 
        error: 'Patient account not found' 
      }, { status: 404 })
    }

    // Verify the provided information matches the search hash
    if (patientResult.rows[0].search_hash !== providedSearchHash) {
      return NextResponse.json({ 
        error: 'The information provided does not match our records. Please ensure your name, date of birth, and email are entered exactly as your dentist has them on file.' 
      }, { status: 400 })
    }

    // Activate the patient account
    await query(
      'UPDATE patients SET activated = true WHERE patient_id = $1',
      [patientId]
    )

    // Delete the setup token
    await query(
      'DELETE FROM patient_setup_tokens WHERE token = $1',
      [token]
    )

    // Create JWT token for patient
    const userData = {
      id: patientId,
      userType: 'patient',
      email: email
    }

    const jwtToken = await new SignJWT(userData)
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .sign(secret)

    // Log audit entry
    await query(
      `INSERT INTO audit_logs (patient_id, action, metadata, ip_address, user_agent) 
       VALUES ($1, $2, $3, $4, $5)`,
      [
        patientId,
        'PATIENT_SETUP_COMPLETED',
        JSON.stringify({ 
          email,
          timestamp: Date.now()
        }),
        request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        request.headers.get('user-agent') || 'unknown'
      ]
    )

    // Set auth cookie
    const response = NextResponse.json({ 
      success: true,
      message: 'Account setup completed successfully',
      patientId
    })

    response.cookies.set('auth-token', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    })

    return response

  } catch (error) {
    console.error('Patient setup error:', error)
    return NextResponse.json({ 
      error: 'Failed to complete account setup' 
    }, { status: 500 })
  }
}