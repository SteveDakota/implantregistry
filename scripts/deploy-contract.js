// Deploy Stability Smart Contract
require('dotenv').config({ path: '.env.local' })

const STABILITY_API_URL = process.env.STABILITY_API_URL

if (!STABILITY_API_URL) {
  console.error('ERROR: STABILITY_API_URL not found in .env.local')
  process.exit(1)
}

const deployContract = async () => {
  const contractCode = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ImplantRegistry {
    
    struct ImplantRecord {
        uint256 id;
        string patientId;
        string recordType;
        string recordData;
        uint256 timestamp;
    }
    
    struct AuditEntry {
        uint256 id;
        string dentistId;
        string patientId;
        string action;
        string metadata;
        uint256 timestamp;
    }
    
    mapping(string => ImplantRecord[]) public patientRecords;
    mapping(uint256 => ImplantRecord) public recordsById;
    mapping(uint256 => AuditEntry) public auditLogs;
    
    uint256 public nextRecordId;
    uint256 public nextAuditId;
    
    event ImplantRecordAdded(uint256 indexed recordId, string indexed patientId, string recordType);
    event AuditLogAdded(uint256 indexed auditId, string indexed dentistId, string indexed patientId, string action);
    
    function addImplantRecord(
        string memory patientId, 
        string memory recordType, 
        string memory recordData
    ) public returns (uint256) {
        uint256 recordId = nextRecordId++;
        ImplantRecord memory newRecord = ImplantRecord(
            recordId,
            patientId,
            recordType,
            recordData,
            block.timestamp
        );
        
        patientRecords[patientId].push(newRecord);
        recordsById[recordId] = newRecord;
        
        emit ImplantRecordAdded(recordId, patientId, recordType);
        return recordId;
    }
    
    function getImplantRecords(string memory patientId) 
        public view returns (ImplantRecord[] memory) {
        return patientRecords[patientId];
    }
    
    function getRecordById(uint256 recordId) 
        public view returns (ImplantRecord memory) {
        return recordsById[recordId];
    }
    
    function addAuditLog(
        string memory dentistId,
        string memory patientId,
        string memory action,
        string memory metadata
    ) public returns (uint256) {
        uint256 auditId = nextAuditId++;
        auditLogs[auditId] = AuditEntry(
            auditId,
            dentistId,
            patientId,
            action,
            metadata,
            block.timestamp
        );
        
        emit AuditLogAdded(auditId, dentistId, patientId, action);
        return auditId;
    }
    
    function getNextRecordId() public view returns (uint256) {
        return nextRecordId;
    }
    
    function getNextAuditId() public view returns (uint256) {
        return nextAuditId;
    }
}`

  const data = {
    code: contractCode,
    arguments: []
  }

  console.log('🚀 Deploying Implant Registry contract to Stability blockchain...')
  
  try {
    const response = await fetch(STABILITY_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result?.error?.message || result.details || result.error || `Request failed with status ${response.status}`)
    }

    if (result.contractAddress) {
      console.log('✅ Contract deployed successfully!')
      console.log(`📄 Contract Address: ${result.contractAddress}`)
      console.log(`🔗 Transaction Hash: ${result.hash || 'N/A'}`)
      console.log('')
      console.log('📋 Next steps:')
      console.log('1. Add this to your .env.local file:')
      console.log(`   STABILITY_CONTRACT_ADDRESS="${result.contractAddress}"`)
      console.log('')
      console.log('2. Test the contract with:')
      console.log('   npm run test-contract')
    } else {
      throw new Error('Contract deployment did not return an address')
    }

  } catch (error) {
    console.error('❌ Contract deployment failed:')
    console.error(error.message)
    console.log('')
    console.log('🔧 Troubleshooting:')
    console.log('- Check your STABILITY_API_URL in .env.local')
    console.log('- Verify your API key is valid')
    console.log('- Check Stability blockchain status')
    process.exit(1)
  }
}

deployContract()