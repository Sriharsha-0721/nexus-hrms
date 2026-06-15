import dotenv from 'dotenv';
dotenv.config();

import { connectDB } from './src/config/db_pg.js';

async function main() {
  console.log('Starting connectivity test using db_pg.js adapter...');
  try {
    const pool = await connectDB();
    const result = await pool.request().query('SELECT version() AS version, current_schema() AS schema');
    console.log('\n==================================================');
    console.log('[SUCCESS] Supabase Connection Verified!');
    console.log('Database Version:', result.recordset[0].version);
    console.log('Current Schema  :', result.recordset[0].schema);
    console.log('==================================================\n');
  } catch (err) {
    console.error('\n[ERROR] Connectivity test failed:', err);
  } finally {
    process.exit(0);
  }
}

main();
