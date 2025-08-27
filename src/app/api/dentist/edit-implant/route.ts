import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { writeImplantRecord, writeAuditLog } from '@/lib/blockchain'
import { verify } from 'jsonwebtoken'

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key'

export async function PUT(request: NextRequest) {
  try {
    // Verify dentist authentication
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
    const { 
      originalTxHash,
      patientId, 
      recordType, 
      brand, 
      model, 
      lot, 
      diameter, 
      length, 
      location, 
      placementDate, 
      removalDate, 
      removalReason, 
      editReason
    } = body

    // Validate required fields
    if (!originalTxHash || !patientId || !recordType || !location || !editReason) {
      return NextResponse.json({ 
        error: 'Original transaction hash, patient ID, record type, location, and edit reason are required' 
      }, { status: 400 })
    }

    // Verify original record exists and belongs to this dentist
    const originalRecord = await query(
      'SELECT * FROM blockchain_cache WHERE tx_hash = $1 AND dentist_id = $2 AND is_corrected = false',
      [originalTxHash, dentistData.id]
    )

    if (originalRecord.rows.length === 0) {
      return NextResponse.json({ 
        error: 'Original record not found or already corrected' 
      }, { status: 404 })
    }

    // Get dentist info
    const dentistResult = await query(
      'SELECT id, name FROM dentists WHERE id = $1',
      [dentistData.id]
    )
    const dentist = dentistResult.rows[0]

    // Prepare corrected record data
    const recordData = {
      brand,
      model,
      lot,
      diameter,
      length,
      location,
      placementDate,
      removalDate,
      removalReason,
      entryMethod: 'correction',
      dentistId: dentistData.id,
      dentistName: dentist.name,
      editReason,
      originalTxHash
    }

    // Write corrected record to blockchain
    console.log('Writing corrected implant record to blockchain...')
    const newTxHash = await writeImplantRecord({
      patientId,
      recordType: recordType as 'PLACEMENT' | 'REMOVAL',
      recordData
    })

    console.log('Blockchain correction write successful:', newTxHash)

    // Mark original record as corrected in database
    await query(
      `UPDATE implant_references 
       SET is_corrected = true, corrected_by_tx_hash = $1 
       WHERE tx_hash = $2`,
      [newTxHash, originalTxHash]
    )

    // Mark original record as corrected in cache
    await query(
      `UPDATE blockchain_cache 
       SET is_corrected = true, corrected_by_tx_hash = $1, updated_at = NOW() 
       WHERE tx_hash = $2`,
      [newTxHash, originalTxHash]
    )

    // Add new corrected record to database references
    await query(
      `INSERT INTO implant_references (patient_id, dentist_id, tx_hash, record_type, is_corrected, created_at) 
       VALUES ($1, $2, $3, $4, false, NOW())`,
      [patientId, dentistData.id, newTxHash, recordType]
    )


    // Write audit log to blockchain
    await writeAuditLog(
      dentistData.id,
      patientId,
      `IMPLANT_${recordType}_CORRECTION`,
      {
        originalTxHash,
        newTxHash,
        editReason,
        location,
        timestamp: Date.now(),
        dentistName: dentist.name
      }
    )

    // Log audit entry in database
    await query(
      `INSERT INTO audit_logs (dentist_id, patient_id, action, metadata, ip_address, user_agent) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        dentistData.id,
        patientId,
        `IMPLANT_${recordType}_CORRECTION`,
        JSON.stringify({ 
          originalTxHash,
          newTxHash,
          editReason,
          location,
          recordType,
          timestamp: Date.now()
        }),
        request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        request.headers.get('user-agent') || 'unknown'
      ]
    )

    return NextResponse.json({
      success: true,
      message: `Implant ${recordType.toLowerCase()} corrected successfully`,
      originalTxHash,
      newTxHash,
      patientId,
      recordType,
      location,
      editReason,
      timestamp: Date.now()
    })

  } catch (error) {
    console.error('Implant correction error:', error)
    
    return NextResponse.json({ 
      error: 'Failed to correct implant record',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}