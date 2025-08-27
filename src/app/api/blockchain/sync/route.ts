import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { readImplantRecords } from '@/lib/blockchain'
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

    console.log('🔄 Starting blockchain sync...')

    // Check if sync is enabled
    const syncStatusResult = await query('SELECT sync_enabled FROM sync_status LIMIT 1')
    if (syncStatusResult.rows.length === 0 || !syncStatusResult.rows[0].sync_enabled) {
      return NextResponse.json({ 
        error: 'Blockchain sync is disabled' 
      }, { status: 403 })
    }

    // Get all unique patient IDs from database
    const patientsResult = await query('SELECT DISTINCT patient_id FROM patients')
    const patientIds = patientsResult.rows.map(row => row.patient_id)

    let syncedRecords = 0
    let errors = []

    for (const patientId of patientIds) {
      try {
        console.log(`Syncing records for patient: ${patientId}`)
        
        // Read records from blockchain
        const blockchainRecords = await readImplantRecords(patientId)
        console.log(`Found ${blockchainRecords.length} blockchain records for patient ${patientId}:`, blockchainRecords)
        
        // Get all tx hashes for this patient that aren't in cache yet
        const missingTxResult = await query(`
          SELECT ir.tx_hash, ir.record_type, ir.created_at
          FROM implant_references ir
          WHERE ir.patient_id = $1 
          AND NOT EXISTS (
            SELECT 1 FROM blockchain_cache bc 
            WHERE bc.tx_hash = ir.tx_hash
          )
          ORDER BY ir.created_at ASC
        `, [patientId])

        // Match blockchain records to tx hashes by position (oldest first)
        for (let i = 0; i < blockchainRecords.length && i < missingTxResult.rows.length; i++) {
          const record = blockchainRecords[i]
          const txRef = missingTxResult.rows[i]

          // Verify the record type matches
          if (record.recordType === txRef.record_type) {
            // Insert with the correct tx hash
            await query(`
              INSERT INTO blockchain_cache (
                patient_id, dentist_id, tx_hash, record_type, record_data, 
                is_corrected, placement_date, removal_date, location, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, false, $6, $7, $8, NOW(), NOW())
            `, [
              patientId,
              record.recordData.dentistId || null,
              txRef.tx_hash,
              record.recordType,
              JSON.stringify(record.recordData),
              record.recordType === 'PLACEMENT' ? record.recordData.placementDate : null,
              record.recordType === 'REMOVAL' ? record.recordData.removalDate : null,
              record.recordData.location
            ])

            syncedRecords++
            console.log(`✅ Synced record with real tx hash: ${txRef.tx_hash}`)
          } else {
            console.log(`⚠️  Record type mismatch: blockchain has ${record.recordType}, tx ref has ${txRef.record_type}`)
          }
        }
        
      } catch (patientError) {
        console.error(`Error syncing patient ${patientId}:`, patientError)
        errors.push(`Patient ${patientId}: ${patientError instanceof Error ? patientError.message : String(patientError)}`)
      }
    }

    // Update sync status
    await query(
      'UPDATE sync_status SET last_sync = NOW() WHERE id = (SELECT id FROM sync_status LIMIT 1)'
    )

    // Log sync audit entry
    await query(
      `INSERT INTO audit_logs (dentist_id, action, metadata, ip_address, user_agent) 
       VALUES ($1, $2, $3, $4, $5)`,
      [
        dentistData.id,
        'BLOCKCHAIN_SYNC',
        JSON.stringify({ 
          syncedRecords,
          patientCount: patientIds.length,
          errors: errors.length,
          timestamp: Date.now()
        }),
        request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        request.headers.get('user-agent') || 'unknown'
      ]
    )

    console.log(`✅ Blockchain sync completed: ${syncedRecords} records synced`)

    return NextResponse.json({
      success: true,
      message: 'Blockchain sync completed',
      syncedRecords,
      patientCount: patientIds.length,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: Date.now()
    })

  } catch (error) {
    console.error('Blockchain sync error:', error)
    return NextResponse.json({ 
      error: 'Failed to sync blockchain',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get sync status
    const syncStatusResult = await query(`
      SELECT sync_enabled, last_sync, sync_frequency_hours 
      FROM sync_status 
      LIMIT 1
    `)

    const syncStatus = syncStatusResult.rows[0] || {
      sync_enabled: false,
      last_sync: null,
      sync_frequency_hours: 1
    }

    return NextResponse.json({
      syncEnabled: syncStatus.sync_enabled,
      lastSync: syncStatus.last_sync,
      syncFrequencyHours: syncStatus.sync_frequency_hours,
      nextSync: syncStatus.last_sync ? 
        new Date(new Date(syncStatus.last_sync).getTime() + syncStatus.sync_frequency_hours * 60 * 60 * 1000) : 
        null
    })

  } catch (error) {
    console.error('Sync status error:', error)
    return NextResponse.json({ 
      error: 'Failed to get sync status' 
    }, { status: 500 })
  }
}