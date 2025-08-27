import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { verify } from 'jsonwebtoken'

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key'

export async function POST(request: NextRequest) {
  try {
    // Verify dentist authentication (admin-level feature)
    const authToken = request.cookies.get('auth-token')?.value
    if (!authToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    let dentistData
    try {
      dentistData = verify(authToken, JWT_SECRET) as any
      if (dentistData.userType !== 'dentist') {
        throw new Error('Invalid user type')
      }
    } catch (error) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 })
    }

    const body = await request.json()
    const { enabled, syncFrequencyHours } = body

    if (typeof enabled !== 'boolean') {
      return NextResponse.json({ 
        error: 'enabled field must be a boolean' 
      }, { status: 400 })
    }

    // Update sync settings
    const updateQuery = syncFrequencyHours ? 
      'UPDATE sync_status SET sync_enabled = $1, sync_frequency_hours = $2' :
      'UPDATE sync_status SET sync_enabled = $1'
    
    const updateParams = syncFrequencyHours ? 
      [enabled, syncFrequencyHours] : 
      [enabled]

    await query(updateQuery, updateParams)

    // Log admin action
    await query(
      `INSERT INTO audit_logs (dentist_id, action, metadata, ip_address, user_agent) 
       VALUES ($1, $2, $3, $4, $5)`,
      [
        dentistData.id,
        'SYNC_TOGGLE',
        JSON.stringify({ 
          enabled,
          syncFrequencyHours: syncFrequencyHours || 'unchanged',
          timestamp: Date.now()
        }),
        request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        request.headers.get('user-agent') || 'unknown'
      ]
    )

    return NextResponse.json({
      success: true,
      message: `Blockchain sync ${enabled ? 'enabled' : 'disabled'}`,
      enabled,
      syncFrequencyHours: syncFrequencyHours || 'unchanged'
    })

  } catch (error) {
    console.error('Sync toggle error:', error)
    return NextResponse.json({ 
      error: 'Failed to toggle sync settings' 
    }, { status: 500 })
  }
}