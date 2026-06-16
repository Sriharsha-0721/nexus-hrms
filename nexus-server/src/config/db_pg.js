import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Parse connection string or construct from credentials
const connectionString = process.env.DATABASE_URL;

const config = connectionString 
  ? { connectionString, ssl: { rejectUnauthorized: false } }
  : {
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      host: process.env.DB_SERVER || 'localhost',
      database: process.env.DB_DATABASE || 'postgres',
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    };

const pool = new Pool(config);

let poolPromise;

export const connectDB = async () => {
  if (!poolPromise) {
    pool.request = () => new PostgresRequest(pool);
    pool.transaction = () => new PostgresTransaction(pool);
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

const CASED_COLUMN_NAMES = new Set([
  // EmployeeMaster
  'EmpID', 'FirstName', 'LastName', 'DOJ', 'Designation', 'Department', 'EmpStatus', 'DepartmentID', 'DesignationID', 'IsPayrollEligible',
  // EmployeeDetails
  'FullName', 'DOB', 'Gender', 'Address', 'Phone', 'EmailID', 'PersonalEmail', 'OfficialEmail', 'BankName', 'BankAccountNo', 'IFSCCode', 'UPPID', 'MaritalStatus', 'Nationality', 'EmploymentType', 'AadharNo', 'PANNo', 'UANNo', 'EmergencyContactName', 'EmergencyContactPhone',
  // AdminLogins & EmployeeLogins
  'AppUserID', 'Username', 'Password', 'Role', 'LastLogin', 'UserStatus', 'FailedAttempts', 'LockoutUntil', 'EmployeeUserID',
  // EmployeeAttendance
  'AttendanceID', 'AttendanceDate', 'AttendanceStatus', 'CheckInTime', 'CheckOutTime', 'ClockIn', 'ClockOut', 'TotalHours',
  // EmployeeLeaveDetails
  'LeaveID', 'LeaveType', 'FromDate', 'ToDate', 'LeaveStatus', 'LeaveDate', 'LeaveReason', 'LeaveDays', 'LeaveStartDate', 'LeaveEndDate', 'TotalDays', 'IsPaidLeave', 'ApprovedBy',
  // EmployeeLogDetails
  'LogID', 'LogDate', 'LoginTime', 'LogoutTime',
  // SalaryRevisions
  'RevisionID', 'EffectiveDate', 'BasicSalary', 'HouseRentAllowance', 'SpecialAllowance', 'MedicalAllowance', 'ConveyanceAllowance', 'OtherAllowance', 'ProvidentFundPercent', 'ProfessionalTaxPercent', 'TDS', 'Remarks', 'IsActive', 'CreatedAt',
  // EmployeeProfileChangeRequests
  'RequestID', 'RequestedData', 'Status', 'Reason', 'RequestedAt', 'ProcessedBy', 'ProcessedAt',
  // AdminEmployeeMapping & EmployeeReporting
  'MappingID', 'AdminEmpID', 'EmployeeEmpID', 'ReportingID', 'ManagerEmpID',
  // PayrollRuns
  'RunID', 'SalaryMonth', 'SalaryYear', 'Version', 'RunDate', 'ApprovedDate', 'GeneratedBy', 'ReleasedBy', 'ReleasedAt',
  // PayrollApprovalOtp
  'OtpID', 'GeneratedForAdminID', 'OtpCode', 'ExpiresAt', 'IsVerified',
  // EmployeeSalarysDetails
  'SalaryID', 'DaysPaid', 'DaysInMonth', 'LossOfPay', 'ITPAN', 'ProvidentFund', 'HealthInsurance', 'ProfessionalTax', 'NetSalaryPaid', 'PaymentMode', 'TransactionRef', 'PaymentDate', 'PFNo', 'IFSC', 'CompOffEncashment', 'PaymentStatus',
  // PayrollRunSummary
  'SummaryID', 'TotalEmployees', 'EmployeesProcessed', 'EmployeesSkipped', 'GrossAmount', 'TotalPF', 'TotalPT', 'TotalTDS', 'TotalLOP', 'NetPayable', 'ExceptionsCount',
  // PayslipDispatchLogs
  'DispatchID', 'RecipientEmail', 'DispatchStatus', 'ErrorMessage', 'DispatchedAt', 'EmailAddress',
  // AuditLogs & ImportAuditLogs
  'AuditID', 'ActionType', 'ActionDesc', 'ActionTime', 'ImportID', 'FileType', 'UploadedBy', 'UploadedDate', 'TotalRows', 'SuccessRows', 'FailedRows',
  // Notifications & EmployeeDocuments
  'NotificationID', 'Title', 'Message', 'IsRead', 'Category', 'RelatedID', 'DocID', 'DocName', 'DocType', 'FilePath', 'UploadedAt',
  // PasswordResetTokens
  'TokenID', 'TokenHash',
  // Frontend/API CamelCase renames
  'firstName', 'lastName', 'empId', 'userId', 'employeeId', 'legacyEmpId', 'managerName', 'payrollVersion', 'releaseDate', 'absentDays', 'unpaidLeaveDays', 'roleName'
]);

const CASED_NAME_MAP = {};
for (const name of CASED_COLUMN_NAMES) {
  CASED_NAME_MAP[name.toLowerCase()] = name;
}

const normalizeRowKeys = (row, sqlText = '') => {
  if (!row || typeof row !== 'object') return row;

  const normalized = { ...row };

  const sqlAliases = [];
  const aliasRegex = /\bAS\s+([a-zA-Z0-9_]+)\b/gi;
  let match;
  while ((match = aliasRegex.exec(sqlText)) !== null) {
    sqlAliases.push(match[1]);
  }

  const aliasMap = {};
  for (const alias of sqlAliases) {
    aliasMap[alias.toLowerCase()] = alias;
  }

  for (const key of Object.keys(row)) {
    const lowerKey = key.toLowerCase();
    
    if (aliasMap[lowerKey] !== undefined) {
      normalized[aliasMap[lowerKey]] = row[key];
    } else if (CASED_NAME_MAP[lowerKey] !== undefined) {
      normalized[CASED_NAME_MAP[lowerKey]] = row[key];
    }
  }

  return makeCaseInsensitiveRow(normalized);
};

// Helper to make PostgreSQL query result rows case-insensitive (matching MSSQL behavior)
const makeCaseInsensitiveRow = (row) => {
  if (!row || typeof row !== 'object') return row;
  
  const lowerKeys = {};
  for (const key of Object.keys(row)) {
    lowerKeys[key.toLowerCase()] = key;
  }

  return new Proxy(row, {
    get(target, prop) {
      if (typeof prop === 'string') {
        const lowerProp = prop.toLowerCase();
        const actualKey = lowerKeys[lowerProp];
        if (actualKey !== undefined) {
          return target[actualKey];
        }
      }
      return target[prop];
    },
    has(target, prop) {
      if (typeof prop === 'string') {
        const lowerProp = prop.toLowerCase();
        if (lowerKeys[lowerProp] !== undefined) {
          return true;
        }
      }
      return prop in target;
    },
    set(target, prop, value) {
      if (typeof prop === 'string') {
        const lowerProp = prop.toLowerCase();
        const actualKey = lowerKeys[lowerProp];
        if (actualKey !== undefined) {
          target[actualKey] = value;
          return true;
        }
      }
      target[prop] = value;
      return true;
    }
  });
};

// Request wrapper to match the MSSQL pool.request() pattern
class PostgresRequest {
  constructor(poolOrClient) {
    this.poolOrClient = poolOrClient;
    this.inputs = {};
  }

  input(name, type, value) {
    let actualType = type;
    let actualValue = value;
    
    // If only 2 arguments are provided (name, value)
    if (value === undefined) {
      actualValue = type;
      actualType = undefined;
    }
    
    let processedValue = actualValue;
    const typeStr = actualType ? actualType.toString() : '';
    if (typeStr === 'Bit' || name.toLowerCase().startsWith('is')) {
      if (actualValue === 1 || actualValue === '1') {
        processedValue = true;
      } else if (actualValue === 0 || actualValue === '0') {
        processedValue = false;
      }
    }
    this.inputs[name] = processedValue;
    return this;
  }

  async query(sqlText) {
    let pgSql = sqlText;
    
    // 0. Pre-process boolean/bit comparisons and literals for PostgreSQL
    pgSql = pgSql.replace(/\bIsActive\s*=\s*1\b/gi, 'IsActive = true');
    pgSql = pgSql.replace(/\bIsActive\s*=\s*0\b/gi, 'IsActive = false');
    pgSql = pgSql.replace(/\bIsPayrollEligible\s*=\s*1\b/gi, 'IsPayrollEligible = true');
    pgSql = pgSql.replace(/\bIsPayrollEligible\s*=\s*0\b/gi, 'IsPayrollEligible = false');
    pgSql = pgSql.replace(/\bIsVerified\s*=\s*1\b/gi, 'IsVerified = true');
    pgSql = pgSql.replace(/\bIsVerified\s*=\s*0\b/gi, 'IsVerified = false');
    pgSql = pgSql.replace(/\bIsRead\s*=\s*1\b/gi, 'IsRead = true');
    pgSql = pgSql.replace(/\bIsRead\s*=\s*0\b/gi, 'IsRead = false');
    pgSql = pgSql.replace(/\bIsOptional\s*=\s*1\b/gi, 'IsOptional = true');
    pgSql = pgSql.replace(/\bIsOptional\s*=\s*0\b/gi, 'IsOptional = false');
    pgSql = pgSql.replace(/\bIsCarryForward\s*=\s*1\b/gi, 'IsCarryForward = true');
    pgSql = pgSql.replace(/\bIsCarryForward\s*=\s*0\b/gi, 'IsCarryForward = false');
    pgSql = pgSql.replace(/\bIsUsed\s*=\s*1\b/gi, 'IsUsed = true');
    pgSql = pgSql.replace(/\bIsUsed\s*=\s*0\b/gi, 'IsUsed = false');

    // Robust table-specific replacements for raw 1 and 0 literals
    if (pgSql.toLowerCase().includes('dbo.notifications')) {
      pgSql = pgSql.replace(/,\s*0\s*,/g, ', false,');
      pgSql = pgSql.replace(/,\s*1\s*,/g, ', true,');
      pgSql = pgSql.replace(/,\s*0\s*,\s*getdate\(\)/gi, ', false, GETDATE()');
      pgSql = pgSql.replace(/,\s*0\s*,\s*current_timestamp/gi, ', false, CURRENT_TIMESTAMP');
    }

    if (pgSql.toLowerCase().includes('dbo.payrollapprovalotp')) {
      pgSql = pgSql.replace(/,\s*0\s*\)/gi, ', false)');
      pgSql = pgSql.replace(/,\s*1\s*\)/gi, ', true)');
    }

    if (pgSql.toLowerCase().includes('dbo.salaryrevisions')) {
      pgSql = pgSql.replace(/,\s*1\s*,\s*getdate\(\)/gi, ', true, GETDATE()');
      pgSql = pgSql.replace(/,\s*0\s*,\s*getdate\(\)/gi, ', false, GETDATE()');
      pgSql = pgSql.replace(/,\s*1\s*,\s*current_timestamp/gi, ', true, CURRENT_TIMESTAMP');
      pgSql = pgSql.replace(/,\s*0\s*,\s*current_timestamp/gi, ', false, CURRENT_TIMESTAMP');
      pgSql = pgSql.replace(/,\s*1\s*\)/gi, ', true)');
      pgSql = pgSql.replace(/,\s*0\s*\)/gi, ', false)');
    }

    // 1. Replace GETDATE() -> CURRENT_TIMESTAMP
    pgSql = pgSql.replace(/GETDATE\(\)/gi, 'CURRENT_TIMESTAMP');

    // 2. Replace DATEADD(minute, 15, GETDATE()) -> CURRENT_TIMESTAMP + INTERVAL '15 minutes'
    pgSql = pgSql.replace(/DATEADD\(minute,\s*(\d+),\s*CURRENT_TIMESTAMP\)/gi, "CURRENT_TIMESTAMP + INTERVAL '$1 minutes'");
    pgSql = pgSql.replace(/DATEADD\(minute,\s*(\d+),\s*GETDATE\(\)\)/gi, "CURRENT_TIMESTAMP + INTERVAL '$1 minutes'");

    // 3. Translate OUTPUT clause for PostgreSQL
    // Strip inserted. and deleted. prefixes from fields
    pgSql = pgSql.replace(/\b(inserted|deleted)\./gi, '');
    // Replace OUTPUT with RETURNING
    pgSql = pgSql.replace(/\bOUTPUT\b/gi, 'RETURNING');

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

    // 10. Relocate RETURNING clause to the end of the query (PostgreSQL syntax requirement)
    if (pgSql.includes('RETURNING')) {
      const match = pgSql.match(/RETURNING\s+([a-zA-Z0-9_*.,\s]+?)(?=\b(VALUES|WHERE)\b)/i);
      if (match) {
        const returningClause = match[0];
        pgSql = pgSql.replace(returningClause, '');
        pgSql = pgSql.trim() + ' ' + returningClause.trim();
      }
    }

    // Split by semicolons not inside single quotes
    const statements = pgSql.split(/;(?=(?:[^']*'[^']*')*[^']*$)/).map(s => s.trim()).filter(s => s.length > 0);

    const executeStatement = async (stmt) => {
      const stmtParams = [];
      const paramRegex = /@([a-zA-Z0-9_]+)/g;
      let paramIndex = 1;
      
      const pgStmt = stmt.replace(paramRegex, (fullMatch, paramName) => {
        stmtParams.push(this.inputs[paramName]);
        return `$${paramIndex++}`;
      });

      return await this.poolOrClient.query(pgStmt, stmtParams);
    };

    if (statements.length > 1) {
      let lastRes = null;
      for (const statement of statements) {
        lastRes = await executeStatement(statement);
      }
      const wrappedRows = lastRes.rows ? lastRes.rows.map(row => normalizeRowKeys(row, pgSql)) : [];
      return {
        recordset: wrappedRows,
        rowsAffected: [lastRes.rowCount],
        recordsets: [wrappedRows]
      };
    } else {
      const res = await executeStatement(statements[0] || pgSql);
      const wrappedRows = res.rows ? res.rows.map(row => normalizeRowKeys(row, pgSql)) : [];
      return {
        recordset: wrappedRows,
        rowsAffected: [res.rowCount],
        recordsets: [wrappedRows]
      };
    }
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

const createSqlType = (typeName) => {
  const fn = function() { return typeName; };
  fn.toString = () => typeName;
  fn.valueOf = () => typeName;
  return fn;
};

// SQL compatibility constants
export const sql = {
  Int: createSqlType('Int'),
  VarChar: createSqlType('VarChar'),
  Decimal: createSqlType('Decimal'),
  Bit: createSqlType('Bit'),
  Date: createSqlType('Date'),
  MAX: 'MAX',
  Request: PostgresRequest,
  Transaction: PostgresTransaction
};

export default {
  connectDB,
  sql
};
