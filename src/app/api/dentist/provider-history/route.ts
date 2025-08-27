import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { jwtVerify } from 'jose'

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

    // Get all implants placed by this dentist
    const historyResult = await query(`
      SELECT 
        bc.tx_hash,
        bc.record_type,
        bc.record_data,
        bc.placement_date,
        bc.removal_date,
        bc.location,
        bc.created_at,
        bc.patient_id
      FROM blockchain_cache bc
      WHERE bc.dentist_id = $1
      AND bc.is_corrected = false
      ORDER BY bc.created_at DESC
      LIMIT 100
    `, [dentistData.id])

    const providerHistory = historyResult.rows.map(row => ({
      txHash: row.tx_hash,
      recordType: row.record_type,
      location: row.location,
      placementDate: row.placement_date,
      removalDate: row.removal_date,
      createdAt: row.created_at,
      patientId: row.patient_id,
      details: typeof row.record_data === 'string' ? JSON.parse(row.record_data) : row.record_data || {}
    }))

    const summary = {
      totalProcedures: providerHistory.length,
      placements: providerHistory.filter(r => r.recordType === 'PLACEMENT').length,
      removals: providerHistory.filter(r => r.recordType === 'REMOVAL').length,
      lastActivity: providerHistory.length > 0 ? providerHistory[0].createdAt : null
    }

    return NextResponse.json({
      providerHistory,
      summary
    })

  } catch (error) {
    console.error('Provider history error:', error)
    return NextResponse.json({ 
      error: 'Failed to retrieve provider history' 
    }, { status: 500 })
  }
}