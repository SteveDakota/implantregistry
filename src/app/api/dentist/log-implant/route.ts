import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { hashEmail } from '@/lib/crypto'
import { writeImplantRecord, writeAuditLog, readImplantRecords } from '@/lib/blockchain'
import { sendImplantNotification } from '@/lib/email'
import { jwtVerify } from 'jose'

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key'
const secret = new TextEncoder().encode(JWT_SECRET)

export async function POST(request: NextRequest) {
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
    const { 
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
      entryMethod 
    } = body

    // Validate required fields
    if (!patientId || !recordType || !location) {
      return NextResponse.json({ 
        error: 'Patient ID, record type, and location are required' 
      }, { status: 400 })
    }

    if (!['PLACEMENT', 'REMOVAL'].includes(recordType)) {
      return NextResponse.json({ 
        error: 'Record type must be PLACEMENT or REMOVAL' 
      }, { status: 400 })
    }

    if (recordType === 'PLACEMENT' && !placementDate) {
      return NextResponse.json({ 
        error: 'Placement date is required for placement records' 
      }, { status: 400 })
    }

    if (recordType === 'REMOVAL' && (!removalDate || !removalReason)) {
      return NextResponse.json({ 
        error: 'Removal date and reason are required for removal records' 
      }, { status: 400 })
    }

    // Verify patient exists
    const patientResult = await query(
      'SELECT patient_id, email_hash FROM patients WHERE patient_id = $1',
      [patientId]
    )

    if (patientResult.rows.length === 0) {
      return NextResponse.json({ 
        error: 'Patient not found' 
      }, { status: 404 })
    }

    const patient = patientResult.rows[0]

    // Get dentist info
    const dentistResult = await query(
      'SELECT id, name, email FROM dentists WHERE id = $1',
      [dentistData.id]
    )

    if (dentistResult.rows.length === 0) {
      return NextResponse.json({ 
        error: 'Dentist not found' 
      }, { status: 404 })
    }

    const dentist = dentistResult.rows[0]

    // Prepare implant record data (dentistId only, no dentistName for blockchain)
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
      entryMethod: entryMethod || 'manual',
      dentistId: dentistData.id
    }

    // Write to blockchain
    console.log('Writing implant record to blockchain...')
    const txHash = await writeImplantRecord({
      patientId,
      recordType: recordType as 'PLACEMENT' | 'REMOVAL',
      recordData
    })

    console.log('Blockchain write successful:', txHash)

    // Store reference in database
    await query(
      `INSERT INTO implant_references (patient_id, dentist_id, tx_hash, record_type, is_corrected, created_at) 
       VALUES ($1, $2, $3, $4, false, NOW())`,
      [patientId, dentistData.id, txHash, recordType]
    )

    console.log('✅ Blockchain write completed. Cache will be populated by sync or after 2 minute delay.')
    
    // Schedule verification after 2 minutes (background task)
    setTimeout(async () => {
      try {
        console.log('🔄 Starting delayed verification for tx:', txHash)
        const blockchainRecords = await readImplantRecords(patientId)
        
        const verifiedRecord = blockchainRecords.find(record => 
          record.recordType === recordType &&
          record.recordData.location === location
        )

        if (verifiedRecord) {
          // Check if already in cache
          const existingCache = await query('SELECT id FROM blockchain_cache WHERE tx_hash = $1', [txHash])
          
          if (existingCache.rows.length === 0) {
            await query(
              `INSERT INTO blockchain_cache (
                patient_id, dentist_id, tx_hash, record_type, record_data, 
                is_corrected, placement_date, removal_date, location, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, false, $6, $7, $8, NOW(), NOW())`,
              [
                patientId,
                verifiedRecord.recordData.dentistId || dentistData.id,
                txHash,
                verifiedRecord.recordType,
                JSON.stringify(verifiedRecord.recordData),
                verifiedRecord.recordType === 'PLACEMENT' ? verifiedRecord.recordData.placementDate : null,
                verifiedRecord.recordType === 'REMOVAL' ? verifiedRecord.recordData.removalDate : null,
                verifiedRecord.recordData.location
              ]
            )
            console.log('✅ Cache populated with verified blockchain data after 2min delay')
          }
        } else {
          console.log('⚠️ Delayed verification failed - record not found on blockchain')
        }
      } catch (error) {
        console.error('Delayed verification error:', error)
      }
    }, 2 * 60 * 1000) // 2 minutes

    // Log audit entry in database (using the implant's blockchain tx hash)
    await query(
      `INSERT INTO audit_logs (dentist_id, patient_id, action, metadata, ip_address, user_agent) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        dentistData.id,
        patientId,
        `IMPLANT_${recordType}`,
        JSON.stringify({ 
          location,
          recordType,
          auditTxHash: txHash,  // Use the implant's blockchain tx hash as the audit tx hash
          timestamp: Date.now()
        }),
        request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        request.headers.get('user-agent') || 'unknown'
      ]
    )

    // Send patient notification email (if patient has email)
    try {
      // Get patient email from hash (we need to reverse lookup - this requires storing email)
      // For now, we'll skip email notification as we don't store actual emails
      console.log('Patient notification skipped - email not stored for privacy')
    } catch (emailError) {
      console.error('Failed to send patient notification:', emailError)
      // Don't fail the whole operation if email fails
    }

    return NextResponse.json({
      success: true,
      message: `Implant ${recordType.toLowerCase()} logged successfully`,
      txHash: txHash, // This should be the REAL blockchain transaction hash
      patientId,
      recordType,
      location,
      timestamp: Date.now()
    })

  } catch (error) {
    console.error('Implant logging error:', error)
    
    // If blockchain write fails, don't store in database
    return NextResponse.json({ 
      error: 'Failed to log implant record',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}