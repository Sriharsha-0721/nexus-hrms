import pg from 'pg';
import dotenv from 'dotenv';
import dns from 'dns';

dotenv.config();

const { Pool } = pg;

// Custom lookup function to force IPv4 and bypass IPv6 connection errors on Render
const ipv4Lookup = (hostname, options, callback) => {
  dns.lookup(hostname, { ...options, family: 4 }, callback);
};

// Parse connection string or construct from credentials
const connectionString = process.env.DATABASE_URL;

const config = connectionString 
  ? { connectionString, ssl: { rejectUnauthorized: false }, lookup: ipv4Lookup }
  : {
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      host: process.env.DB_SERVER || 'localhost',
      database: process.env.DB_DATABASE || 'postgres',
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      lookup: ipv4Lookup
    };

const pool = new Pool(config);

let poolPromise;

export const connectDB = async () => {
  if (!poolPromise) {
    pool.request = () => new PostgresRequest(pool);
    poolPromise = pool.connect()
      .then((client) => {
        console.log('[PG SPIKE] Connected to PostgreSQL successfully!');
        client.release();
        return pool;
      })
      .catch((err) => {
        console.error('[PG SPIKE] PostgreSQL Connection Failed: ', err);
        poolPromise = null;
        throw err;
      });
  }
  return poolPromise;
};

// Request wrapper to match the MSSQL pool.request() pattern
class PostgresRequest {
  constructor(poolOrClient) {
    this.poolOrClient = poolOrClient;
    this.inputs = {};
  }

  input(name, type, value) {
    this.inputs[name] = value;
    return this;
  }

  async query(sqlText) {
    let pgSql = sqlText;
    const params = [];
    const paramRegex = /@([a-zA-Z0-9_]+)/g;
    const paramMap = {};
    let paramIndex = 1;

    // Replace @name with $1, $2, etc., and populate params array in order
    pgSql = pgSql.replace(paramRegex, (fullMatch, paramName) => {
      if (!(paramName in paramMap)) {
        paramMap[paramName] = paramIndex++;
        params.push(this.inputs[paramName]);
      }
      return `$${paramMap[paramName]}`;
    });

    // 1. Replace GETDATE() -> CURRENT_TIMESTAMP
    pgSql = pgSql.replace(/GETDATE\(\)/gi, 'CURRENT_TIMESTAMP');

    // 2. Replace DATEADD(minute, 15, GETDATE()) -> CURRENT_TIMESTAMP + INTERVAL '15 minutes'
    pgSql = pgSql.replace(/DATEADD\(minute,\s*(\d+),\s*CURRENT_TIMESTAMP\)/gi, "CURRENT_TIMESTAMP + INTERVAL '$1 minutes'");
    pgSql = pgSql.replace(/DATEADD\(minute,\s*(\d+),\s*GETDATE\(\)\)/gi, "CURRENT_TIMESTAMP + INTERVAL '$1 minutes'");

    // 3. Replace OUTPUT inserted.ColName -> RETURNING ColName
    // Parse: OUTPUT inserted.LeaveID AS leave_id
    pgSql = pgSql.replace(/OUTPUT\s+inserted\.([a-zA-Z0-9_*]+)(\s+AS\s+[a-zA-Z0-9_]+)?/gi, 'RETURNING $1$2');
    // Parse compound OUTPUT items: OUTPUT inserted.A, inserted.B AS b
    pgSql = pgSql.replace(/OUTPUT\s+inserted\.([a-zA-Z0-9_.]+)(?:\s+AS\s+([a-zA-Z0-9_]+))?,\s*inserted\.([a-zA-Z0-9_.]+)(?:\s+AS\s+([a-zA-Z0-9_]+))?/gi, 'RETURNING $1 AS $2, $3 AS $4');
    
    // Fallback: match simple OUTPUT inserted.LeaveID AS leave_id, inserted.EmpID AS employee_id, ...
    pgSql = pgSql.replace(/OUTPUT\s+inserted\.([a-zA-Z0-9_]+)\s+AS\s+([a-zA-Z0-9_]+),\s*inserted\.([a-zA-Z0-9_]+)\s+AS\s+([a-zA-Z0-9_]+),\s*inserted\.([a-zA-Z0-9_]+)\s+AS\s+([a-zA-Z0-9_]+),\s*inserted\.([a-zA-Z0-9_]+)\s+AS\s+([a-zA-Z0-9_]+),\s*inserted\.([a-zA-Z0-9_]+)\s+AS\s+([a-zA-Z0-9_]+),\s*inserted\.([a-zA-Z0-9_]+)\s+AS\s+([a-zA-Z0-9_]+)/gi, 
      'RETURNING $1 AS $2, $3 AS $4, $5 AS $6, $7 AS $8, $9 AS $10, $11 AS $12');
    
    // Explicit mappings for leaveService applyLeave insert OUTPUT statement:
    pgSql = pgSql.replace(/OUTPUT\s+inserted\.LeaveID\s+AS\s+leave_id,\s+inserted\.EmpID\s+AS\s+employee_id,\s+inserted\.LeaveType\s+AS\s+leave_type,\s+inserted\.FromDate\s+AS\s+start_date,\s+inserted\.ToDate\s+AS\s+end_date,\s+inserted\.LeaveStatus\s+AS\s+status/gi, 
      'RETURNING LeaveID AS leave_id, EmpID AS employee_id, LeaveType AS leave_type, FromDate AS start_date, ToDate AS end_date, LeaveStatus AS status');
    
    // Explicit mappings for leaveService approveRejectLeave update OUTPUT statement:
    pgSql = pgSql.replace(/OUTPUT\s+inserted\.LeaveID\s+AS\s+leave_id,\s+inserted\.EmpID\s+AS\s+employee_id,\s+inserted\.LeaveType\s+AS\s+leave_type,\s+inserted\.LeaveStatus\s+AS\s+status,\s+inserted\.ApprovedBy\s+AS\s+approved_by/gi, 
      'RETURNING LeaveID AS leave_id, EmpID AS employee_id, LeaveType AS leave_type, LeaveStatus AS status, ApprovedBy AS approved_by');

    // 4. Replace TOP N -> LIMIT N
    if (/SELECT\s+TOP\s+(\d+)/i.test(pgSql)) {
      const limitMatch = pgSql.match(/SELECT\s+TOP\s+(\d+)/i);
      const limitVal = limitMatch[1];
      pgSql = pgSql.replace(/SELECT\s+TOP\s+\d+/i, 'SELECT');
      pgSql += ` LIMIT ${limitVal}`;
    }

    // 5. Replace string concatenation: + -> ||
    pgSql = pgSql.replace(/FirstName\s*\+\s*'\s*'\s*\+\s*LastName/gi, "FirstName || ' ' || LastName");
    pgSql = pgSql.replace(/FirstName\s*\+\s*'\s*'\s*\+\s*m\.LastName/gi, "FirstName || ' ' || m.LastName");
    pgSql = pgSql.replace(/m\.FirstName\s*\+\s*'\s*'\s*\+\s*m\.LastName/gi, "m.FirstName || ' ' || m.LastName");
    pgSql = pgSql.replace(/mgr\.FirstName\s*\+\s*'\s*'\s*\+\s*mgr\.LastName/gi, "mgr.FirstName || ' ' || mgr.LastName");
    pgSql = pgSql.replace(/adm\.FirstName\s*\+\s*'\s*'\s*\+\s*adm\.LastName/gi, "adm.FirstName || ' ' || adm.LastName");
    pgSql = pgSql.replace(/a\.FirstName\s*\+\s*'\s*'\s*\+\s*a\.LastName/gi, "a.FirstName || ' ' || a.LastName");
    pgSql = pgSql.replace(/e\.FirstName\s*\+\s*'\s*'\s*\+\s*e\.LastName/gi, "e.FirstName || ' ' || e.LastName");

    // 6. Replace ISNULL -> COALESCE
    pgSql = pgSql.replace(/ISNULL\(/gi, 'COALESCE(');

    // 7. Replace DATEDIFF(day, FromDate, ToDate) -> (ToDate - FromDate)
    pgSql = pgSql.replace(/DATEDIFF\(day,\s*([a-zA-Z0-9_.]+),\s*([a-zA-Z0-9_.]+)\)/gi, '($2 - $1)');

    // 8. Replace YEAR(FromDate) -> EXTRACT(YEAR FROM FromDate)
    pgSql = pgSql.replace(/YEAR\(([a-zA-Z0-9_.]+)\)/gi, 'EXTRACT(YEAR FROM $1)');

    // 9. Replace MONTH(FromDate) -> EXTRACT(MONTH FROM FromDate)
    pgSql = pgSql.replace(/MONTH\(([a-zA-Z0-9_.]+)\)/gi, 'EXTRACT(MONTH FROM $1)');

    const res = await this.poolOrClient.query(pgSql, params);
    return {
      recordset: res.rows,
      rowsAffected: [res.rowCount],
      recordsets: [res.rows]
    };
  }
}

// Transaction wrapper to match MSSQL
class PostgresTransaction {
  constructor(pool) {
    this.pool = pool;
    this.client = null;
  }

  async begin() {
    this.client = await this.pool.connect();
    await this.client.query('BEGIN');
  }

  async commit() {
    await this.client.query('COMMIT');
    this.client.release();
  }

  async rollback() {
    await this.client.query('ROLLBACK');
    this.client.release();
  }

  request() {
    return new PostgresRequest(this.client || this.pool);
  }
}

// SQL compatibility constants
export const sql = {
  Int: 'Int',
  VarChar: 'VarChar',
  Bit: 'Bit',
  Date: 'Date',
  Request: PostgresRequest,
  Transaction: PostgresTransaction
};

export default {
  connectDB,
  sql
};
