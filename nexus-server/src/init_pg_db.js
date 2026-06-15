import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

async function initDatabase() {
  console.log('==================================================');
  console.log('       SUPABASE POSTGRESQL INITIALIZER SCRIPT     ');
  console.log('==================================================');

  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL environment variable is not defined in .env');
    process.exit(1);
  }

  console.log('Connecting to Supabase database...');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  let client;
  try {
    client = await pool.connect();
    console.log('Connected successfully!');

    // Helper to run SQL file
    const runSqlFile = async (filePath) => {
      const fullPath = path.resolve(__dirname, filePath);
      console.log(`\nReading SQL file: ${fullPath}...`);
      const sqlText = fs.readFileSync(fullPath, 'utf8');
      
      console.log(`Executing SQL script (${sqlText.length} bytes)...`);
      await client.query(sqlText);
      console.log(`SUCCESS: Executed ${path.basename(filePath)} successfully.`);
    };

    // 1. Run schema_pg.sql
    await runSqlFile('../../database/schema_pg.sql');

    // 2. Run seed_data_pg.sql
    await runSqlFile('../../database/seed_data_pg.sql');

    // 3. Run historical_data_pg.sql
    await runSqlFile('../../database/historical_data_pg.sql');

    console.log('\n==================================================');
    console.log('      DATABASE INITIALIZATION COMPLETED SUCCESSFULLY');
    console.log('==================================================');

  } catch (err) {
    console.error('\nERROR: Database initialization failed:', err);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

initDatabase();
