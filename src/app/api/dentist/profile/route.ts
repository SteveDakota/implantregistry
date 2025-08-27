import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key'
const secret = new TextEncoder().encode(JWT_SECRET)

export async function GET(request: NextRequest) {
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

    // Get dentist profile information
    const profileResult = await query(
      'SELECT id, email, name, license_id, office_address, tooth_notation_preference, active, email_verified, created_at FROM dentists WHERE id = $1',
      [dentistData.id]
    )

    if (profileResult.rows.length === 0) {
      return NextResponse.json({ error: 'Dentist not found' }, { status: 404 })
    }

    const profile = profileResult.rows[0]

    return NextResponse.json({
      id: profile.id,
      email: profile.email,
      name: profile.name,
      licenseId: profile.license_id,
      officeAddress: profile.office_address,
      toothNotationPreference: profile.tooth_notation_preference,
      active: profile.active,
      emailVerified: profile.email_verified,
      createdAt: profile.created_at
    })

  } catch (error) {
    console.error('Profile fetch error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch profile' 
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
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
    const { name, licenseId, officeAddress, toothNotationPreference } = body

    if (!name || !licenseId || !officeAddress || !toothNotationPreference) {
      return NextResponse.json({ 
        error: 'Name, license ID, office address, and tooth notation preference are required' 
      }, { status: 400 })
    }

    if (!['universal', 'iso'].includes(toothNotationPreference)) {
      return NextResponse.json({ 
        error: 'Tooth notation preference must be "universal" or "iso"' 
      }, { status: 400 })
    }

    // Update dentist profile
    await query(
      'UPDATE dentists SET name = $1, license_id = $2, office_address = $3, tooth_notation_preference = $4, updated_at = NOW() WHERE id = $5',
      [name, licenseId, officeAddress, toothNotationPreference, dentistData.id]
    )

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully'
    })

  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json({ 
      error: 'Failed to update profile' 
    }, { status: 500 })
  }
}