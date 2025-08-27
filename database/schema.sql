-- Implant Registry Database Schema

-- Dentists table
CREATE TABLE dentists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    email_hash VARCHAR(64) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    license_id VARCHAR(100) NOT NULL,
    office_address TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Patients table (privacy-first design)
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id VARCHAR(36) UNIQUE NOT NULL, -- Custom patient ID
    email_hash VARCHAR(64) NOT NULL,
    search_hash VARCHAR(64) UNIQUE NOT NULL, -- hash(name|dob|email)
    verification_hash VARCHAR(64) NOT NULL, -- hash(patient_id + email_hash)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES dentists(id)
);

-- Blockchain transaction references
CREATE TABLE implant_references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id VARCHAR(36) REFERENCES patients(patient_id),
    dentist_id UUID REFERENCES dentists(id),
    tx_hash VARCHAR(66) NOT NULL, -- Blockchain transaction hash
    record_type VARCHAR(20) NOT NULL, -- 'PLACEMENT' or 'REMOVAL'
    is_corrected BOOLEAN DEFAULT false,
    corrected_by_tx_hash VARCHAR(66), -- Points to correction transaction
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Blockchain cache for fast reads
CREATE TABLE blockchain_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id VARCHAR(36) NOT NULL,
    dentist_id UUID NOT NULL,
    tx_hash VARCHAR(66) NOT NULL,
    record_type VARCHAR(20) NOT NULL,
    record_data JSONB NOT NULL, -- Cached blockchain data
    is_corrected BOOLEAN DEFAULT false,
    corrected_by_tx_hash VARCHAR(66),
    placement_date DATE,
    removal_date DATE,
    location VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Magic link tokens
CREATE TABLE magic_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_hash VARCHAR(64) NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    user_type VARCHAR(20) NOT NULL, -- 'dentist' or 'patient'
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit logs for compliance
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dentist_id UUID REFERENCES dentists(id),
    patient_id VARCHAR(36),
    action VARCHAR(50) NOT NULL, -- 'SEARCH', 'PLACEMENT', 'REMOVAL', 'VIEW'
    metadata JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sync status for blockchain cache
CREATE TABLE sync_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    last_sync TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sync_enabled BOOLEAN DEFAULT true,
    sync_frequency_hours INTEGER DEFAULT 1
);

-- Indexes for performance
CREATE INDEX idx_patients_search_hash ON patients(search_hash);
CREATE INDEX idx_patients_patient_id ON patients(patient_id);
CREATE INDEX idx_patients_email_hash ON patients(email_hash);
CREATE INDEX idx_implant_references_patient_id ON implant_references(patient_id);
CREATE INDEX idx_implant_references_tx_hash ON implant_references(tx_hash);
CREATE INDEX idx_blockchain_cache_patient_id ON blockchain_cache(patient_id);
CREATE INDEX idx_blockchain_cache_tx_hash ON blockchain_cache(tx_hash);
CREATE INDEX idx_magic_links_token ON magic_links(token);
CREATE INDEX idx_magic_links_email_hash ON magic_links(email_hash);
CREATE INDEX idx_audit_logs_dentist_id ON audit_logs(dentist_id);
CREATE INDEX idx_audit_logs_patient_id ON audit_logs(patient_id);

-- Insert initial sync status
INSERT INTO sync_status (sync_enabled, sync_frequency_hours) VALUES (true, 1);