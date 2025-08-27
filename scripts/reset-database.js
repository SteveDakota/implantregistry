// Reset Database - Clear all data and start fresh
require('dotenv').config({ path: '.env.local' })

const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

const resetDatabase = async () => {
  console.log('🗑️  Resetting Implant Registry database...')
  
  try {
    const client = await pool.connect()

    // Clear all data from tables (in order to handle foreign key constraints)
    console.log('Clearing all data...')
    
    await client.query('DELETE FROM audit_logs')
    console.log('✅ Cleared audit_logs')
    
    await client.query('DELETE FROM blockchain_cache')
    console.log('✅ Cleared blockchain_cache')
    
    await client.query('DELETE FROM implant_references')
    console.log('✅ Cleared implant_references')
    
    await client.query('DELETE FROM magic_links')
    console.log('✅ Cleared magic_links')
    
    await client.query('DELETE FROM patients')
    console.log('✅ Cleared patients')
    
    await client.query('DELETE FROM dentists')
    console.log('✅ Cleared dentists')
    
    // Reset sync_status but keep the table structure
    await client.query('UPDATE sync_status SET last_sync = NULL, sync_enabled = true')
    console.log('✅ Reset sync_status')

    client.release()
    
    console.log('')
    console.log('🎉 Database reset complete!')
    console.log('📋 Next steps:')
    console.log('1. Go to http://localhost:3000')
    console.log('2. Register a new dentist account')
    console.log('3. Check Ethereal email for verification')
    console.log('4. Test the complete workflow')
    console.log('')
    console.log('📧 Ethereal Email Login:')
    console.log('   Email: sx2o3jngj7xhkl5k@ethereal.email')
    console.log('   Password: ndzapnNdE7QM5cA9zS')
    console.log('   URL: https://ethereal.email/')

  } catch (error) {
    console.error('❌ Database reset failed:')
    console.error(error.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

resetDatabase()