import { config } from 'dotenv';
import mysql from 'mysql2/promise';

// Load .env file
config();

const DATABASE_URL = process.env.DATABASE_URL;
const MYSQL_URL = process.env.MYSQL_URL;

console.log('\n🔍 Testing Database Connection...\n');

let testedAny = false;

// 1. Test MySQL if configured
if (MYSQL_URL || DATABASE_URL?.startsWith('mysql://')) {
  const urlToTest = MYSQL_URL || DATABASE_URL;
  console.log(`🔌 Testing MySQL Connection: ${urlToTest.replace(/:([^@:]+)@/, ':****@')} ...`);
  try {
    const parsed = new URL(urlToTest);
    const connection = await mysql.createConnection({
      host: parsed.hostname || '127.0.0.1',
      port: parsed.port ? parseInt(parsed.port, 10) : 3306,
      user: decodeURIComponent(parsed.username || 'root'),
      password: decodeURIComponent(parsed.password || ''),
      database: parsed.pathname ? parsed.pathname.replace(/^\//, '') : 'kanak_turnkey',
      connectTimeout: 8000,
    });

    const [verResult] = await connection.query('SELECT VERSION() as version, DATABASE() as db');
    const dbName = verResult[0]?.db || 'kanak_turnkey';
    const version = verResult[0]?.version || 'unknown';

    console.log(`✅ Successfully connected to MySQL database '${dbName}'!`);
    console.log(`📦 MySQL Server Version: ${version}`);

    const [tables] = await connection.query(`
      SELECT TABLE_NAME as tableName 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ?
      ORDER BY TABLE_NAME ASC
    `, [dbName]);

    console.log(`📊 Found ${tables.length} tables in MySQL:`);
    for (const t of tables.slice(0, 10)) {
      console.log(`   - ${t.tableName}`);
    }
    if (tables.length > 10) {
      console.log(`   ... and ${tables.length - 10} more tables`);
    }
    console.log('');
    await connection.end();
    testedAny = true;
  } catch (error) {
    console.error(`❌ MySQL Connection failed: ${error.message}\n`);
  }
}

// 2. Test PostgreSQL if configured
if (DATABASE_URL && (DATABASE_URL.startsWith('postgres://') || DATABASE_URL.startsWith('postgresql://'))) {
  console.log(`🔌 Testing PostgreSQL Connection: ${DATABASE_URL.replace(/:([^@:]+)@/, ':****@')} ...`);
  try {
    const pg = await import('pg');
    const { Pool } = pg.default || pg;
    const pool = new Pool({ connectionString: DATABASE_URL });
    const client = await pool.connect();

    console.log('✅ Successfully connected to PostgreSQL!');
    const result = await client.query('SELECT NOW() as time, version() as version');
    console.log(`⏰ Server time: ${result.rows[0].time}`);
    console.log(`📦 PostgreSQL version: ${result.rows[0].version.split(',')[0]}\n`);

    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    console.log(`📊 Found ${tablesResult.rows.length} tables:`);
    tablesResult.rows.slice(0, 10).forEach(row => console.log(`   - ${row.table_name}`));
    if (tablesResult.rows.length > 10) {
      console.log(`   ... and ${tablesResult.rows.length - 10} more tables`);
    }
    console.log('');

    client.release();
    await pool.end();
    testedAny = true;
  } catch (error) {
    console.error(`❌ PostgreSQL Connection failed: ${error.message}\n`);
  }
}

if (!testedAny) {
  if (DATABASE_URL?.startsWith('file:')) {
    console.log('ℹ️  Currently configured for local embedded PGlite/SQLite.');
    console.log('   The application uses embedded storage with automatic schema migration.');
  } else {
    console.log('ℹ️  No external PostgreSQL or MySQL configured.');
    console.log('   Set MYSQL_URL=mysql://root:password@127.0.0.1:3306/kanak_turnkey in .env for MySQL');
    console.log('   Or DATABASE_URL=postgresql://... for PostgreSQL/Supabase');
  }
}

console.log('========================================================\n');
