import dotenv from 'dotenv';

dotenv.config();

const provider = process.env.DB_PROVIDER || 'mssql';

let connectDB;
let sql;

if (provider === 'postgres') {
  console.log('[NEXUS DB] Utilizing PostgreSQL Provider (Supabase)');
  const pgAdapter = await import('./db_pg.js');
  connectDB = pgAdapter.connectDB;
  sql = pgAdapter.sql;
} else {
  console.log('[NEXUS DB] Utilizing Microsoft SQL Server Provider (Local)');
  const mssqlAdapter = await import('mssql/msnodesqlv8.js');

  const server = process.env.DB_SERVER === 'localhost' || process.env.DB_SERVER === '127.0.0.1' 
    ? '(local)' 
    : (process.env.DB_SERVER || '(local)');

  const database = process.env.DB_DATABASE || 'NexusHRMS';

  const connectionString = `Driver={ODBC Driver 18 for SQL Server};Server=${server};Database=${database};Trusted_Connection=yes;TrustServerCertificate=yes;`;

  const config = {
    connectionString,
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
  };

  let poolPromise;

  connectDB = async () => {
    if (!poolPromise) {
      poolPromise = new mssqlAdapter.default.ConnectionPool(config)
        .connect()
        .then((pool) => {
          console.log('Connected to SQL Server successfully via Named Pipes/Shared Memory (msnodesqlv8)');
          return pool;
        })
        .catch((err) => {
          console.error('Database Connection Failed: ', err);
          poolPromise = null;
          throw err;
        });
    }
    return poolPromise;
  };
  sql = mssqlAdapter.default;
}

export { connectDB, sql };
