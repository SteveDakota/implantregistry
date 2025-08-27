# Implant Registry MVP

A secure, blockchain-powered dental implant tracking system with privacy-first design.

## Features

- **Privacy-First**: Patient PII is never stored - only hashed identifiers
- **Blockchain Integration**: Immutable implant records on Stability blockchain  
- **Magic Link Authentication**: Passwordless login for patients, secure email verification
- **QR Code Patient Portal**: Easy access for patients via QR codes
- **Audit Trail**: Complete tracking of all access and modifications
- **Real-time Sync**: Blockchain data cached for fast access with hourly sync

## Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **Database**: PostgreSQL (Neon)
- **Blockchain**: Stability Protocol (no gas fees)
- **Email**: Nodemailer with SMTP
- **Authentication**: JWT tokens with magic links

## Quick Start

### 1. Environment Setup

Copy `.env.local.example` to `.env.local` and configure:

```bash
cp .env.local.example .env.local
```

Required environment variables:
```bash
# Database
DATABASE_URL="postgresql://username:password@host:5432/database"

# Stability Blockchain  
STABILITY_API_URL="https://rpc.stabilityprotocol.com/zkt/YOUR_API_KEY"
STABILITY_CONTRACT_ADDRESS="" # Leave empty initially

# Email (use Ethereal Email for testing)
EMAIL_SERVER_HOST="smtp.ethereal.email"
EMAIL_SERVER_PORT="587"
EMAIL_SERVER_USER="your-ethereal-user"
EMAIL_SERVER_PASSWORD="your-ethereal-password"
EMAIL_FROM="noreply@implant-registry.local"

# App
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-random-secret-key"
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Database Setup

Set up your PostgreSQL database (Neon recommended):

```bash
npm run db:setup
```

### 4. Deploy Smart Contract

Deploy the implant registry contract to Stability blockchain:

```bash
npm run deploy-contract
```

Copy the returned contract address to your `.env.local`:
```bash
STABILITY_CONTRACT_ADDRESS="0x..."
```

### 5. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to see the application.

## Development Workflow

### Dentist Flow
1. **Register**: Visit `/dentist` → Enter details → Receive magic link email
2. **Login**: Enter email → Receive magic link → Access dashboard
3. **Log Implant**: Search patient → Verify → Enter implant details → Blockchain write
4. **Search**: Find patient records → View history

### Patient Flow  
1. **Access Portal**: Scan QR code or visit `/patient`
2. **Login**: Enter email → Receive magic link → View records
3. **Self-Register**: Enter name+DOB+email → Receive magic link

### Key Security Features

- **Email Hashing**: All emails stored as SHA-256 hashes
- **Search Hash**: `hash(name|dob|email)` for patient lookup
- **Verification Hash**: `hash(patientId+emailHash)` for ID verification
- **Magic Links**: 10-minute expiry, single-use tokens
- **Blockchain Audit**: All implant data immutable on-chain

## Database Schema

### Core Tables
- `dentists` - Dentist accounts and credentials
- `patients` - Patient identifiers (no PII stored)
- `implant_references` - Links to blockchain transactions
- `blockchain_cache` - Fast access to blockchain data
- `magic_links` - Authentication tokens
- `audit_logs` - Compliance tracking

### Privacy Design
- Patient names/DOB never stored in database
- Only email hashes and computed search/verification hashes stored
- Blockchain contains implant data linked by patient ID
- Email addresses used only for authentication

## API Endpoints

### Authentication
- `POST /api/auth/send-magic-link` - Send magic link email
- `GET /api/auth/verify?token=...` - Verify magic link

### Dentist APIs
- `POST /api/dentist/register` - Register new dentist
- `POST /api/dentist/search-patient` - Find patient by identifiers
- `POST /api/dentist/log-implant` - Record new implant
- `GET /api/dentist/history` - Get provider history

### Patient APIs  
- `POST /api/patient/register` - Self-register patient
- `GET /api/patient/records` - Get patient's implant history
- `GET /api/patient/audit-log` - Get access audit trail

### Blockchain APIs
- `POST /api/blockchain/write` - Write to smart contract
- `GET /api/blockchain/read` - Read from smart contract
- `POST /api/blockchain/sync` - Force cache sync

## Deployment

### Vercel Deployment
1. Connect your GitHub repo to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy: `npm run build && npm start`

### Database Migration
Run schema updates:
```bash
npm run db:setup
```

### Contract Updates
Redeploy contract if needed:
```bash
npm run deploy-contract
```

## Testing

### Test Contract Connection
```bash
npm run test-contract
```

### Manual Testing Flow
1. Register a dentist account
2. Create a patient record
3. Log an implant placement
4. Access patient portal with QR code
5. Verify blockchain data consistency

## Troubleshooting

### Common Issues

**Contract deployment fails**
- Check STABILITY_API_URL in .env.local
- Verify API key is valid and has sufficient quota

**Magic links not sending**
- Test email configuration with Ethereal Email
- Check spam folder for test emails
- Verify EMAIL_FROM address format

**Database connection errors**
- Confirm DATABASE_URL format
- Test connection: `psql $DATABASE_URL -c "SELECT 1"`
- Check firewall settings for Neon

**Patient ID verification fails**
- Ensure exact email match (case-sensitive hashing)
- Check that patient was created with correct identifiers
- Verify search_hash generation logic

## Architecture Notes

### Privacy & Compliance
- HIPAA-conscious design with minimal PII storage
- All patient data pseudonymized with hashes
- Blockchain provides tamper-proof audit trail
- Email-only patient authentication reduces attack surface

### Scalability  
- Blockchain cache table enables fast reads
- Hourly sync keeps data fresh without API spam
- PostgreSQL indexes optimize common queries
- JWT tokens reduce database auth lookups

### Security
- Magic links prevent password attacks
- JWT tokens with reasonable expiry
- Rate limiting on sensitive endpoints
- SQL injection prevention with parameterized queries

## Support

For questions or issues, check the troubleshooting section above or create an issue in the repository.