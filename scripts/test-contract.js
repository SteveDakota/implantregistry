// Test Stability Smart Contract Integration
require('dotenv').config({ path: '.env.local' })

const STABILITY_API_URL = process.env.STABILITY_API_URL
const CONTRACT_ADDRESS = process.env.STABILITY_CONTRACT_ADDRESS

if (!STABILITY_API_URL || !CONTRACT_ADDRESS) {
  console.error('ERROR: Missing environment variables in .env.local')
  console.error('Required: STABILITY_API_URL, STABILITY_CONTRACT_ADDRESS')
  process.exit(1)
}

const CONTRACT_ABI = [
  "function addImplantRecord(string patientId, string recordType, string recordData) public returns (uint256)",
  "function getImplantRecords(string patientId) public view returns (tuple(uint256 id, string patientId, string recordType, string recordData, uint256 timestamp)[])",
  "function getRecordById(uint256 recordId) public view returns (tuple(uint256 id, string patientId, string recordType, string recordData, uint256 timestamp))",
  "function addAuditLog(string dentistId, string patientId, string action, string metadata) public returns (uint256)"
]

const testContract = async () => {
  console.log('🧪 Testing Implant Registry smart contract...')
  console.log(`📄 Contract Address: ${CONTRACT_ADDRESS}`)
  console.log('')

  // Test data
  const testPatientId = 'test-patient-123'
  const testDentistId = 'dentist-456'
  const testRecordData = JSON.stringify({
    brand: 'Straumann',
    model: 'BLT RC',
    lot: 'LOT123',
    diameter: '4.1mm',
    length: '10mm',
    location: 'Tooth #30',
    placementDate: '2024-01-15',
    dentistId: testDentistId
  })

  try {
    // Test 1: Add implant record
    console.log('1️⃣ Testing addImplantRecord...')
    const writeData = {
      to: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      method: "addImplantRecord",
      arguments: [
        testPatientId,
        "PLACEMENT",
        testRecordData
      ]
    }

    const writeResponse = await fetch(STABILITY_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(writeData)
    })

    const writeResult = await writeResponse.json()

    if (!writeResponse.ok) {
      throw new Error(`Write failed: ${JSON.stringify(writeResult)}`)
    }

    console.log('✅ Write successful!')
    console.log(`   Transaction Hash: ${writeResult.hash}`)
    console.log(`   Record ID: ${writeResult.result || 'N/A'}`)
    console.log('')

    // Test 2: Read implant records
    console.log('2️⃣ Testing getImplantRecords...')
    const readData = {
      to: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      method: "getImplantRecords",
      arguments: [testPatientId]
    }

    const readResponse = await fetch(STABILITY_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(readData)
    })

    const readResult = await readResponse.json()

    if (!readResponse.ok) {
      throw new Error(`Read failed: ${JSON.stringify(readResult)}`)
    }

    console.log('✅ Read successful!')
    console.log(`   Records found: ${readResult.result ? readResult.result.length : 0}`)
    if (readResult.result && readResult.result.length > 0) {
      const record = readResult.result[0]
      console.log(`   First record: ID=${record[0]}, Type=${record[2]}, Patient=${record[1]}`)
    }
    console.log('')

    // Test 3: Add audit log
    console.log('3️⃣ Testing addAuditLog...')
    const auditData = {
      to: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      method: "addAuditLog",
      arguments: [
        testDentistId,
        testPatientId,
        "PLACEMENT",
        JSON.stringify({ test: true, timestamp: Date.now() })
      ]
    }

    const auditResponse = await fetch(STABILITY_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(auditData)
    })

    const auditResult = await auditResponse.json()

    if (!auditResponse.ok) {
      throw new Error(`Audit failed: ${JSON.stringify(auditResult)}`)
    }

    console.log('✅ Audit log successful!')
    console.log(`   Transaction Hash: ${auditResult.hash}`)
    console.log('')

    console.log('🎉 All tests passed! Smart contract is working correctly.')
    console.log('')
    console.log('✨ Ready to build the rest of the application!')

  } catch (error) {
    console.error('❌ Contract test failed:')
    console.error(error.message)
    console.log('')
    console.log('🔧 Troubleshooting:')
    console.log('- Verify contract was deployed successfully')
    console.log('- Check STABILITY_API_URL and CONTRACT_ADDRESS in .env.local')
    console.log('- Confirm API key has sufficient quota')
    process.exit(1)
  }
}

testContract()