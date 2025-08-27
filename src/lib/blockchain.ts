// Stability Blockchain Integration
const STABILITY_API_URL = process.env.STABILITY_API_URL!
const CONTRACT_ADDRESS = process.env.STABILITY_CONTRACT_ADDRESS!

// Smart Contract ABI for Implant Registry
const CONTRACT_ABI = [
  "function addImplantRecord(string patientId, string recordType, string recordData) public returns (uint256)",
  "function getImplantRecords(string patientId) public view returns (tuple(uint256 id, string patientId, string recordType, string recordData, uint256 timestamp)[])",
  "function getRecordById(uint256 recordId) public view returns (tuple(uint256 id, string patientId, string recordType, string recordData, uint256 timestamp))",
  "function addAuditLog(string dentistId, string patientId, string action, string metadata) public returns (uint256)"
]

export interface ImplantRecord {
  patientId: string
  recordType: 'PLACEMENT' | 'REMOVAL'
  recordData: {
    brand?: string
    model?: string
    lot?: string
    diameter?: string
    length?: string
    location: string
    placementDate?: string
    removalDate?: string
    removalReason?: string
    entryMethod?: string
    dentistId: string
  }
  timestamp?: number
}

export interface BlockchainResponse {
  hash?: string
  result?: any
  error?: any
  contractAddress?: string
}

// Deploy smart contract (run once during setup)
export async function deployContract(): Promise<string> {
  const contractCode = `
    // SPDX-License-Identifier: MIT
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
            return auditId;
        }
    }
  `

  const data = {
    code: contractCode,
    arguments: []
  }

  const response = await fetch(STABILITY_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })

  const result = await response.json()
  
  if (!response.ok) {
    throw new Error(result?.error?.message || result.details || result.error || `Contract deployment failed`)
  }

  if (!result.contractAddress) {
    throw new Error('Contract deployment did not return address')
  }

  return result.contractAddress
}

// Write implant record to blockchain
export async function writeImplantRecord(record: ImplantRecord): Promise<string> {
  if (!CONTRACT_ADDRESS) {
    throw new Error('Contract address not configured')
  }

  const data = {
    to: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    method: "addImplantRecord",
    arguments: [
      record.patientId,
      record.recordType,
      JSON.stringify(record.recordData)
    ]
  }

  console.log('=== BLOCKCHAIN WRITE DEBUG ===')
  console.log('Sending to blockchain:', JSON.stringify(data, null, 2))
  console.log('Record data being sent:', JSON.stringify(record.recordData, null, 2))
  console.log('===============================')

  const response = await fetch(STABILITY_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })

  const result = await response.json()

  if (!response.ok) {
    console.log('ERROR - Full error object:', JSON.stringify(result, null, 2))
    throw new Error(JSON.stringify(result.error) || `Blockchain write failed`)
  }

  console.log('Blockchain response:', JSON.stringify(result, null, 2))
  return result.hash
}

// Read implant records from blockchain
export async function readImplantRecords(patientId: string): Promise<ImplantRecord[]> {
  if (!CONTRACT_ADDRESS) {
    throw new Error('Contract address not configured')
  }

  const data = {
    to: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    method: "getImplantRecords",
    arguments: [patientId]
  }

  const response = await fetch(STABILITY_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })

  const result = await response.json()
  
  console.log('=== BLOCKCHAIN READ DEBUG ===')
  console.log('Full blockchain read response:', JSON.stringify(result, null, 2))
  console.log('=============================')

  if (!response.ok) {
    throw new Error(JSON.stringify(result.error) || `Blockchain read failed`)
  }

  // Check if result.output exists and is an array
  if (!result.output || !Array.isArray(result.output)) {
    console.log('No records found or invalid response structure')
    return []
  }

  // Parse blockchain response into ImplantRecord format
  const records: ImplantRecord[] = result.output.map((record: any) => ({
    patientId: record[1],
    recordType: record[2] as 'PLACEMENT' | 'REMOVAL',
    recordData: JSON.parse(record[3]),
    timestamp: parseInt(record[4])
  }))

  return records
}

// Write audit log to blockchain
export async function writeAuditLog(
  dentistId: string, 
  patientId: string, 
  action: string, 
  metadata: any
): Promise<string> {
  if (!CONTRACT_ADDRESS) {
    throw new Error('Contract address not configured')
  }

  const data = {
    to: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    method: "addAuditLog",
    arguments: [
      dentistId,
      patientId,
      action,
      JSON.stringify(metadata)
    ]
  }

  const response = await fetch(STABILITY_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })

  const result = await response.json()
  
  console.log('=== AUDIT LOG API DEBUG ===')
  console.log('Response status:', response.status)
  console.log('Response ok:', response.ok)
  console.log('Full API response:', JSON.stringify(result, null, 2))
  console.log('Available properties:', Object.keys(result))
  console.log('result.hash:', result.hash)
  console.log('result.transactionHash:', result.transactionHash)
  console.log('========================')

  if (!response.ok) {
    console.log('ERROR - Full error object:', JSON.stringify(result, null, 2))
    throw new Error(JSON.stringify(result.error) || `Audit log write failed`)
  }

  return result.hash
}