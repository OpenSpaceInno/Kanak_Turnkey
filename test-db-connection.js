import { config } from 'dotenv';
import pg from 'pg';

// Load .env file
config();

const DATABASE_URL = process.env.DATABASE_URL;

console.log('\n🔍 Testing Database Connection...\n');

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in .env file');
  console.error('📝 Please add your Supabase connection string to .env:');
  console.error('   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres\n');
  process.exit(1);
}

if (DATABASE_URL.startsWith('file:')) {
  console.log('⚠️  Currently configured for SQLite (file:./local.db)');
  console.log('📝 To use Supabase, update DATABASE_URL in .env to your PostgreSQL connection string\n');
  process.exit(0);
}

const { Pool } = pg;
const pool = new Pool({ connectionString: DATABASE_URL });

try {
  console.log('🔌 Connecting to database...');
  const client = await pool.connect();
  
  console.log('✅ Successfully connected to PostgreSQL!');
  
  // Test query
  const result = await client.query('SELECT NOW() as time, version() as version');
  console.log(`⏰ Server time: ${result.rows[0].time}`);
  console.log(`📦 PostgreSQL version: ${result.rows[0].version.split(',')[0]}\n`);
  
  // Check if tables exist
  const tablesResult = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name
  `);
  
  if (tablesResult.rows.length === 0) {
    console.log('📋 No tables found. Run this to create tables:');
    console.log('   cd lib\\db');
    console.log('   pnpm run push\n');
  } else {
    console.log(`📊 Found ${tablesResult.rows.length} tables:`);
    tablesResult.rows.forEach(row => console.log(`   - ${row.table_name}`));
    console.log('');
  }
  
  client.release();
  await pool.end();
  
  console.log('✅ Database is ready! You can now start the API server.');
  console.log('   cd artifacts\\api-server');
  console.log('   pnpm run dev\n');
  
} catch (error) {
  console.error('❌ Connection failed:', error.message);
  console.error('\n📝 Troubleshooting:');
  console.error('   1. Check your connection string in .env');
  console.error('   2. Verify your Supabase password is correct');
  console.error('   3. Check that your IP is allowed in Supabase settings');
  console.error('   4. Ensure your Supabase project is active\n');
  await pool.end();
  process.exit(1);
}
