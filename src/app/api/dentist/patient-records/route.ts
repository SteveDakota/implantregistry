import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { jwtVerify } from 'jose'
import { writeAuditLog } from '@/lib/blockchain'

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

    // Get patient ID from query parameter
    const url = new URL(request.url)
    const patientId = url.searchParams.get('patientId')

    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID is required' }, { status: 400 })
    }

    // Verify patient exists
    const patientResult = await query(
      'SELECT patient_id, created_at FROM patients WHERE patient_id = $1',
      [patientId]
    )

    if (patientResult.rows.length === 0) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }

    const patient = patientResult.rows[0]

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
      updatedAt: row.updated_at,
      details: typeof row.record_data === 'string' ? JSON.parse(row.record_data) : row.record_data || {}
    }))

    // Get recent audit trail for this patient (including all relevant actions)
    const auditResult = await query(`
      SELECT 
        al.action,
        al.metadata,
        al.created_at,
        d.name as dentist_name
      FROM audit_logs al
      LEFT JOIN dentists d ON al.dentist_id = d.id
      WHERE al.patient_id = $1
      AND al.action IN ('PATIENT_ACCOUNT_CREATED', 'PATIENT_SEARCH', 'PATIENT_RECORDS_VIEW', 'PATIENT_VERIFICATION_SUCCESS', 'PLACEMENT_LOGGED', 'REMOVAL_LOGGED')
      ORDER BY al.created_at DESC
      LIMIT 20
    `, [patientId])

    const auditTrail = auditResult.rows.map(row => ({
      action: row.action,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata || {},
      createdAt: row.created_at,
      dentistName: row.dentist_name
    }))

    // Write audit log to blockchain for records view
    const auditTxHash = await writeAuditLog(
      dentistData.id,
      patientId,
      'PATIENT_RECORDS_VIEW',
      {
        recordCount: records.length,
        timestamp: Date.now()
      }
    )

    // Log this access with blockchain tx hash
    await query(
      `INSERT INTO audit_logs (dentist_id, patient_id, action, metadata, ip_address, user_agent) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        dentistData.id,
        patientId,
        'PATIENT_RECORDS_VIEW',
        JSON.stringify({ 
          recordCount: records.length,
          auditTxHash: auditTxHash,
          timestamp: Date.now()
        }),
        request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        request.headers.get('user-agent') || 'unknown'
      ]
    )

    return NextResponse.json({
      patientId: patient.patient_id,
      patientRegisteredAt: patient.created_at,
      records,
      auditTrail,
      summary: {
        totalRecords: records.length,
        placements: records.filter(r => r.recordType === 'PLACEMENT').length,
        removals: records.filter(r => r.recordType === 'REMOVAL').length,
        lastActivity: records.length > 0 ? records[0].createdAt : patient.created_at
      }
    })

  } catch (error) {
    console.error('Patient records error:', error)
    return NextResponse.json({ 
      error: 'Failed to retrieve patient records' 
    }, { status: 500 })
  }
}