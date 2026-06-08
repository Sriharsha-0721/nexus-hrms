import sql from 'mssql/msnodesqlv8.js';
import dotenv from 'dotenv';

dotenv.config();

// Construct a connection string for native Windows ODBC driver
// This uses Windows Authentication (Trusted Connection) which operates over Shared Memory / Named Pipes
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

export const connectDB = async () => {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(config)
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

export { sql };
