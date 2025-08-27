import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { hashEmail, verifyPassword } from '@/lib/crypto'
import { SignJWT } from 'jose'

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key'
const secret = new TextEncoder().encode(JWT_SECRET)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ 
        error: 'Email and password are required' 
      }, { status: 400 })
    }

    const emailHash = hashEmail(email)

    // Check if dentist exists, is verified, and is active
    const dentistResult = await query(
      'SELECT id, name, email_hash, password_hash, email_verified, active FROM dentists WHERE email_hash = $1',
      [emailHash]
    )

    if (dentistResult.rows.length === 0) {
      return NextResponse.json({ 
        error: 'Invalid email or password' 
      }, { status: 401 })
    }

    const dentist = dentistResult.rows[0]

    if (!dentist.email_verified) {
      return NextResponse.json({ 
        error: 'Please verify your email address first. Check your email for the verification link.' 
      }, { status: 403 })
    }

    if (!dentist.active) {
      return NextResponse.json({ 
        error: 'Account is inactive. Please contact support.' 
      }, { status: 403 })
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, dentist.password_hash)
    if (!isValidPassword) {
      return NextResponse.json({ 
        error: 'Invalid email or password' 
      }, { status: 401 })
    }

    // Create JWT token
    const userData = {
      id: dentist.id,
      name: dentist.name,
      userType: 'dentist'
    }

    const jwtToken = await new SignJWT(userData)
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .sign(secret)

    // Log successful login
    await query(
      `INSERT INTO audit_logs (dentist_id, action, metadata, ip_address, user_agent) 
       VALUES ($1, $2, $3, $4, $5)`,
      [
        dentist.id,
        'DENTIST_LOGIN',
        JSON.stringify({ timestamp: Date.now() }),
        request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        request.headers.get('user-agent') || 'unknown'
      ]
    )

    // Set auth cookie
    const response = NextResponse.json({ 
      success: true,
      message: 'Login successful',
      dentist: {
        id: dentist.id,
        name: dentist.name
      }
    })

    response.cookies.set('auth-token', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    })

    return response

  } catch (error) {
    console.error('Dentist login error:', error)
    return NextResponse.json({ 
      error: 'Login failed' 
    }, { status: 500 })
  }
}