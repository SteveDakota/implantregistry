import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { hashEmail, generatePatientId, generateSearchHash, generateVerificationHash } from '@/lib/crypto'
import { sendMagicLink } from '@/lib/email'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, userType, name, dob } = body

    if (!email || !userType) {
      return NextResponse.json({ error: 'Email and user type required' }, { status: 400 })
    }

    const emailHash = hashEmail(email)
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    if (userType === 'dentist') {
      // Check if dentist exists and is verified
      const dentistResult = await query(
        'SELECT id, email_verified FROM dentists WHERE email_hash = $1',
        [emailHash]
      )

      if (dentistResult.rows.length === 0) {
        return NextResponse.json({ error: 'Dentist account not found' }, { status: 404 })
      }

      if (!dentistResult.rows[0].email_verified) {
        return NextResponse.json({ error: 'Please verify your email address first. Check your email for the verification link.' }, { status: 403 })
      }
    } else if (userType === 'patient') {
      if (name && dob) {
        // Patient trying to recover account with name+dob+email
        const searchHash = generateSearchHash(name, dob, email)
        const patientResult = await query(
          'SELECT patient_id FROM patients WHERE search_hash = $1',
          [searchHash]
        )

        if (patientResult.rows.length === 0) {
          return NextResponse.json({ error: 'No patient record found' }, { status: 404 })
        }
      } else {
        // Patient trying to access with just email (should have patient_id)
        const patientResult = await query(
          'SELECT patient_id FROM patients WHERE email_hash = $1',
          [emailHash]
        )

        if (patientResult.rows.length === 0) {
          return NextResponse.json({ error: 'Patient record not found' }, { status: 404 })
        }
      }
    }

    // Store magic link token
    await query(
      'INSERT INTO magic_links (email_hash, token, user_type, expires_at) VALUES ($1, $2, $3, $4)',
      [emailHash, token, userType, expiresAt]
    )

    // Get patient ID for email notification
    let patientId = null
    if (userType === 'patient') {
      if (name && dob) {
        const searchHash = generateSearchHash(name, dob, email)
        const result = await query('SELECT patient_id FROM patients WHERE search_hash = $1', [searchHash])
        patientId = result.rows[0]?.patient_id
      } else {
        const result = await query('SELECT patient_id FROM patients WHERE email_hash = $1', [emailHash])
        patientId = result.rows[0]?.patient_id
      }
    }

    // Send magic link email
    await sendMagicLink(email, token, userType, patientId)

    return NextResponse.json({ 
      success: true, 
      message: 'Magic link sent to your email'
    })

  } catch (error) {
    console.error('Magic link error:', error)
    return NextResponse.json({ error: 'Failed to send magic link' }, { status: 500 })
  }
}