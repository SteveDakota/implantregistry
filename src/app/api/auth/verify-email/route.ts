import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    const userType = searchParams.get('type')

    if (!token || !userType) {
      return NextResponse.json({ error: 'Invalid verification link' }, { status: 400 })
    }

    if (userType === 'dentist') {
      // For dentists, token is actually the dentist ID from registration
      const dentistResult = await query(
        'SELECT id, email_verified FROM dentists WHERE id = $1',
        [token]
      )

      if (dentistResult.rows.length === 0) {
        return NextResponse.json({ error: 'Invalid verification link' }, { status: 404 })
      }

      if (dentistResult.rows[0].email_verified) {
        return NextResponse.redirect(new URL('/dentist?message=already-verified', request.url))
      }

      // Mark dentist as verified and active
      await query(
        'UPDATE dentists SET email_verified = true, active = true WHERE id = $1',
        [token]
      )

      // Log verification
      await query(
        `INSERT INTO audit_logs (dentist_id, action, metadata, ip_address, user_agent) 
         VALUES ($1, $2, $3, $4, $5)`,
        [
          token,
          'EMAIL_VERIFICATION',
          JSON.stringify({ timestamp: Date.now() }),
          request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          request.headers.get('user-agent') || 'unknown'
        ]
      )

      return NextResponse.redirect(new URL('/dentist?message=verified', request.url))
    }

    return NextResponse.json({ error: 'Invalid user type' }, { status: 400 })

  } catch (error) {
    console.error('Email verification error:', error)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}