import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { hashEmail, generateSearchHash } from '@/lib/crypto'
import { jwtVerify } from 'jose'
import { writeAuditLog } from '@/lib/blockchain'

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
    const { searchMethod, name, dob, email, patientId } = body

    if (!searchMethod || (searchMethod !== 'personal_info' && searchMethod !== 'patient_id')) {
      return NextResponse.json({ 
        error: 'Invalid searchMethod. Use "personal_info" or "patient_id"' 
      }, { status: 400 })
    }

    let searchResult = null

    if (searchMethod === 'personal_info') {
      // Method 1: Search by name + DOB + email
      if (!name || !dob || !email) {
        return NextResponse.json({ 
          error: 'Name, DOB, and email are required for personal_info search' 
        }, { status: 400 })
      }

      const searchHash = generateSearchHash(name, dob, email)
      
      const result = await query(
        'SELECT patient_id, created_at FROM patients WHERE search_hash = $1',
        [searchHash]
      )

      if (result.rows.length > 0) {
        searchResult = {
          found: true,
          message: 'Patient record found. Please enter the Patient ID to verify and proceed.',
          patientFound: true,
          // Don't return the patient_id directly - dentist must enter it manually
          recordCount: result.rows.length,
          registeredDate: result.rows[0].created_at
        }
      } else {
        searchResult = {
          found: false,
          message: 'No patient record found with these identifiers. You can create a new patient account.',
          patientFound: false,
          canCreate: true,
          searchHash,
          patientData: { name, dob, email }
        }
      }

    } else if (searchMethod === 'patient_id') {
      // Method 2: Direct search by patient ID + email
      if (!patientId || !email) {
        return NextResponse.json({ 
          error: 'Patient ID and email are required for patient_id search' 
        }, { status: 400 })
      }

      const emailHash = hashEmail(email)
      
      const result = await query(
        'SELECT patient_id, created_at FROM patients WHERE patient_id = $1 AND email_hash = $2',
        [patientId, emailHash]
      )

      if (result.rows.length > 0) {
        searchResult = {
          found: true,
          message: 'Patient verified successfully.',
          patientId: result.rows[0].patient_id,
          verified: true,
          registeredDate: result.rows[0].created_at
        }
      } else {
        searchResult = {
          found: false,
          message: 'Invalid Patient ID or email combination.',
          verified: false
        }
      }
    }

    // Write audit log to blockchain (for both search methods)
    let auditTxHash = null
    try {
      auditTxHash = await writeAuditLog(
        dentistData.id,
        searchMethod === 'patient_id' && searchResult?.found ? patientId : 'UNKNOWN',
        'PATIENT_SEARCH',
        {
          searchMethod,
          found: searchResult?.found || false,
          timestamp: Date.now()
        }
      )
    } catch (blockchainError) {
      console.error('Blockchain audit log failed:', blockchainError)
      // Continue without blockchain logging - don't break the search
    }

    // Log audit entry in database
    await query(
      `INSERT INTO audit_logs (dentist_id, patient_id, action, metadata, ip_address, user_agent) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        dentistData.id,
        searchMethod === 'patient_id' && searchResult?.found ? patientId : null,
        'PATIENT_SEARCH',
        JSON.stringify({ 
          searchMethod, 
          found: searchResult?.found || false,
          auditTxHash: auditTxHash,  // The blockchain tx hash for this search audit (may be null)
          timestamp: Date.now()
        }),
        request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        request.headers.get('user-agent') || 'unknown'
      ]
    )

    return NextResponse.json(searchResult)

  } catch (error) {
    console.error('Patient search error:', error)
    return NextResponse.json({ 
      error: 'Failed to search for patient' 
    }, { status: 500 })
  }
}