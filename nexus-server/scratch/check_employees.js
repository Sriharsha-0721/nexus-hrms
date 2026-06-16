import dotenv from 'dotenv';
dotenv.config();

import { connectDB } from '../src/config/db_pg.js';

async function main() {
  console.log('Connecting to PostgreSQL to check columns of PayslipDispatchLogs...');
  try {
    const pool = await connectDB();
    const req = pool.request();

    console.log('Listing all columns in dbo.PayslipDispatchLogs:');
    const result = await req.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'dbo' AND table_name = 'payslipdispatchlogs'
      ORDER BY ordinal_position
    `);
    console.table(result.recordset);

  } catch (err) {
    console.error('Error during testing:', err);
  } finally {
    process.exit(0);
  }
}

main();
