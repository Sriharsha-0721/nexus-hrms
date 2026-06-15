import dotenv from 'dotenv';
import pgAdapter from './db_pg.js';

dotenv.config();

const provider = process.env.DB_PROVIDER || 'postgres';

let connectDB;
let sql;

if (provider === 'postgres') {
  console.log('[NEXUS DB] Utilizing PostgreSQL Provider (Supabase)');
  connectDB = pgAdapter.connectDB;
  sql = pgAdapter.sql;
} else {
  throw new Error(`Unsupported DB_PROVIDER: '${provider}'. MSSQL support has been removed. Only 'postgres' is supported.`);
}

export { connectDB, sql };
