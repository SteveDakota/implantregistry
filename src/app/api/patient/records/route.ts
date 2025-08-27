import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { verify } from 'jsonwebtoken'

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key'

export async function GET(request: NextRequest) {
  try {
    // Verify patient authentication
    const authToken = request.cookies.get('auth-token')?.value
    if (!authToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    let patientData
    try {
      patientData = verify(authToken, JWT_SECRET) as any
      if (patientData.userType !== 'patient') {
        throw new Error('Invalid user type')
      }
    } catch (error) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 })
    }

    const patientId = patientData.id

    // Get all implant records from blockchain cache
    const recordsResult = await query(`
      SELECT 
        bc.tx_hash,
        bc.record_type,
        bc.record_data,
        bc.placement_date,
        bc.removal_date,
        bc.location,
        bc.is_corrected,
        bc.corrected_by_tx_hash,
        bc.created_at,
        bc.updated_at,
        d.name as dentist_name
      FROM blockchain_cache bc
      LEFT JOIN dentists d ON bc.dentist_id = d.id
      WHERE bc.patient_id = $1
      AND bc.is_corrected = false
      ORDER BY bc.created_at DESC
    `, [patientId])

    const records = recordsResult.rows.map(row => ({
      txHash: row.tx_hash,
      recordType: row.record_type,
      location: row.location,
      placementDate: row.placement_date,
      removalDate: row.removal_date,
      dentistName: row.dentist_name,
      createdAt: row.created_at,
      details: typeof row.record_data === 'string' ? JSON.parse(row.record_data) : row.record_data || {}
    }))

    // Get audit trail for this patient
    const auditResult = await query(`
      SELECT 
        al.action,
        al.metadata,
        al.created_at,
        d.name as dentist_name
      FROM audit_logs al
      LEFT JOIN dentists d ON al.dentist_id = d.id
      WHERE al.patient_id = $1
      ORDER BY al.created_at DESC
      LIMIT 50
    `, [patientId])

    const auditTrail = auditResult.rows.map(row => ({
      action: row.action,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata || {},
      createdAt: row.created_at,
      dentistName: row.dentist_name
    }))

    // Log this access (no blockchain write - patient viewing their own records)
    await query(
      `INSERT INTO audit_logs (patient_id, action, metadata, ip_address, user_agent) 
       VALUES ($1, $2, $3, $4, $5)`,
      [
        patientId,
        'RECORDS_ACCESS',
        JSON.stringify({ 
          recordCount: records.length,
          timestamp: Date.now()
        }),
        request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        request.headers.get('user-agent') || 'unknown'
      ]
    )

    return NextResponse.json({
      patientId,
      records,
      auditTrail,
      summary: {
        totalRecords: records.length,
        placements: records.filter(r => r.recordType === 'PLACEMENT').length,
        removals: records.filter(r => r.recordType === 'REMOVAL').length
      }
    })

  } catch (error) {
    console.error('Patient records error:', error)
    return NextResponse.json({ 
      error: 'Failed to retrieve patient records' 
    }, { status: 500 })
  }
}