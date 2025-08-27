import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { sign } from 'jsonwebtoken'

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    const userType = searchParams.get('type')

    if (!token || !userType) {
      return NextResponse.json({ error: 'Invalid verification link' }, { status: 400 })
    }

    // Check if token exists and is not expired
    const tokenResult = await query(
      'SELECT email_hash, user_type, used, expires_at FROM magic_links WHERE token = $1',
      [token]
    )

    if (tokenResult.rows.length === 0) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const tokenData = tokenResult.rows[0]

    if (tokenData.used) {
      return NextResponse.json({ error: 'Token already used' }, { status: 401 })
    }

    if (new Date() > new Date(tokenData.expires_at)) {
      return NextResponse.json({ error: 'Token expired' }, { status: 401 })
    }

    if (tokenData.user_type !== userType) {
      return NextResponse.json({ error: 'Invalid user type' }, { status: 401 })
    }

    // Mark token as used
    await query('UPDATE magic_links SET used = true WHERE token = $1', [token])

    // Get user data
    let userData = null
    if (userType === 'dentist') {
      const dentistResult = await query(
        'SELECT id, name, email_hash FROM dentists WHERE email_hash = $1',
        [tokenData.email_hash]
      )
      if (dentistResult.rows.length > 0) {
        userData = {
          id: dentistResult.rows[0].id,
          name: dentistResult.rows[0].name,
          userType: 'dentist'
        }
      }
    } else if (userType === 'patient') {
      const patientResult = await query(
        'SELECT patient_id, email_hash FROM patients WHERE email_hash = $1',
        [tokenData.email_hash]
      )
      if (patientResult.rows.length > 0) {
        userData = {
          id: patientResult.rows[0].patient_id,
          userType: 'patient'
        }
      }
    }

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Create JWT token
    const jwtToken = sign(userData, JWT_SECRET, { expiresIn: '7d' })

    // Create response with redirect
    const redirectUrl = userType === 'dentist' ? '/dentist/dashboard' : '/patient/dashboard'
    
    const response = NextResponse.redirect(new URL(redirectUrl, request.url))
    response.cookies.set('auth-token', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    })

    return response

  } catch (error) {
    console.error('Token verification error:', error)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}