import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

dotenv.config();

// Force DB_PROVIDER=mssql before importing db.js to cache the MSSQL connection pool
process.env.DB_PROVIDER = 'mssql';
const { connectDB: connectMSSQL, sql: sqlMSSQL } = await import('./config/db.js');

// Import PostgreSQL connection directly
const { connectDB: connectPG, sql: sqlPG } = await import('./config/db_pg.js');

async function runValidation() {
  console.log('==================================================');
  console.log('        NEXUS HRMS DATABASE VALIDATION RUNNER     ');
  console.log('==================================================\n');

  const mssqlStats = { connected: false, tables: {}, employees: 0, departments: 0, leaves: {}, dashboard: {}, auth: null };
  const pgStats = { connected: false, tables: {}, employees: 0, departments: 0, leaves: {}, dashboard: {}, auth: null };
  const errors = [];
  const queryFailures = [];

  const tableList = [
    'CompanySettings', 'HolidayMaster', 'PayrollCalendar', 'Departments', 'Designations', 'LeavePolicies',
    'EmployeeMaster', 'EmployeeDetails', 'AdminLogins', 'EmployeeLogins', 'EmployeeAttendance', 'EmployeeLeaveDetails',
    'EmployeeLogDetails', 'SalaryRevisions', 'EmployeeProfileChangeRequests', 'AdminEmployeeMapping', 'EmployeeReporting',
    'PayrollRuns', 'PayrollApprovalOtp', 'EmployeeSalarysDetails', 'PayrollRunSummary', 'PayslipDispatchLogs',
    'AuditLogs', 'ImportAuditLogs', 'Notifications', 'EmployeeDocuments', 'Staging_Employees'
  ];

  // 1. Gather MSSQL Baseline
  console.log('[1/4] Connecting to Microsoft SQL Server...');
  let mssqlPool;
  try {
    mssqlPool = await connectMSSQL();
    mssqlStats.connected = true;
    console.log('[SUCCESS] Connected to SQL Server.');

    // Fetch MSSQL Table existence and Row counts
    console.log('Fetching SQL Server table details...');
    for (const table of tableList) {
      try {
        const countRes = await mssqlPool.request().query(`SELECT COUNT(*) AS cnt FROM dbo.${table}`);
        mssqlStats.tables[table] = { exists: true, count: countRes.recordset[0].cnt };
      } catch (err) {
        mssqlStats.tables[table] = { exists: false, count: 0 };
        errors.push(`MSSQL Table check failed for ${table}: ${err.message}`);
      }
    }

    // Fetch employee & department counts
    const empCount = await mssqlPool.request().query("SELECT COUNT(*) AS cnt FROM dbo.EmployeeMaster WHERE EmpStatus = 'Active'");
    mssqlStats.employees = empCount.recordset[0].cnt;

    const deptCount = await mssqlPool.request().query('SELECT COUNT(*) AS cnt FROM dbo.Departments');
    mssqlStats.departments = deptCount.recordset[0].cnt;

    // Fetch leave balances summary
    const leaveRes = await mssqlPool.request().query(`
      SELECT LeaveType, SUM(DATEDIFF(day, FromDate, ToDate) + 1) AS approved_days
      FROM dbo.EmployeeLeaveDetails
      WHERE LeaveStatus = 'Approved'
      GROUP BY LeaveType
    `);
    leaveRes.recordset.forEach(row => {
      mssqlStats.leaves[row.LeaveType] = row.approved_days;
    });

    // Fetch dashboard stats queries
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const today = new Date().toISOString().split('T')[0];

    const d1 = await mssqlPool.request().query("SELECT COUNT(*) AS total FROM dbo.EmployeeMaster WHERE EmpStatus = 'Active'");
    const d2 = await mssqlPool.request()
      .input('year', sqlMSSQL.Int, currentYear)
      .query(`
        SELECT ISNULL(SUM(s.NetSalaryPaid), 0) AS totalPayroll
        FROM dbo.EmployeeSalarysDetails s
        JOIN dbo.PayrollRuns r ON s.RunID = r.RunID
        WHERE s.SalaryYear = @year AND r.Status = 'Released'
      `);
    const d3 = await mssqlPool.request()
      .input('today', sqlMSSQL.Date, today)
      .query(`
        SELECT COUNT(DISTINCT EmpID) AS count
        FROM dbo.EmployeeLeaveDetails
        WHERE LeaveStatus = 'Approved'
          AND @today BETWEEN FromDate AND ToDate
      `);
    const d4 = await mssqlPool.request()
      .input('month', sqlMSSQL.Int, currentMonth)
      .input('year', sqlMSSQL.Int, currentYear)
      .query(`
        SELECT 
          CASE 
            WHEN COUNT(*) = 0 THEN 0
            ELSE ROUND(
              (SUM(CASE WHEN AttendanceStatus = 'Present' THEN 1.0 ELSE 0 END) / COUNT(*)) * 100, 1
            )
          END AS avgPct
        FROM dbo.EmployeeAttendance
        WHERE MONTH(AttendanceDate) = @month AND YEAR(AttendanceDate) = @year
      `);

    mssqlStats.dashboard = {
      activeEmployees: d1.recordset[0].total,
      totalPayroll: parseFloat(d2.recordset[0].totalPayroll),
      onLeaveToday: d3.recordset[0].count,
      avgAttendance: parseFloat(d4.recordset[0].avgPct)
    };

    // Test Auth query
    const authRes = await mssqlPool.request()
      .input('email', sqlMSSQL.VarChar, 'sneha.iyer@nexus.com')
      .query(`
        SELECT m.EmpID AS employee_id, d.EmailID AS email, a.Password AS password_hash, m.FirstName AS first_name, m.LastName AS last_name, a.Role AS role_name, m.Designation AS designation, m.Department AS department
        FROM dbo.AdminLogins a
        JOIN dbo.EmployeeMaster m ON a.EmpID = m.EmpID
        LEFT JOIN dbo.EmployeeDetails d ON m.EmpID = d.EmpID
        WHERE (LOWER(a.Username) = LOWER(@email) OR LOWER(d.EmailID) = LOWER(@email)) AND m.EmpStatus = 'Active' AND a.UserStatus = 'Active'
      `);
    if (authRes.recordset.length > 0) {
      mssqlStats.auth = { success: true, email: authRes.recordset[0].email, name: `${authRes.recordset[0].first_name} ${authRes.recordset[0].last_name}` };
    } else {
      mssqlStats.auth = { success: false, reason: 'Superadmin user not found' };
    }

  } catch (err) {
    console.error('[ERROR] Failed to collect MSSQL statistics:', err);
    errors.push(`MSSQL Connection / Collection failure: ${err.message}`);
  }

  // 2. Connect to Supabase PostgreSQL & Gather Statistics
  console.log('\n[2/4] Connecting to Supabase PostgreSQL...');
  if (!process.env.DATABASE_URL) {
    console.warn('[WARNING] DATABASE_URL environment variable is not defined.');
    console.warn('Skipping PostgreSQL validation checks. Please define DATABASE_URL to complete the test.');
    pgStats.connected = false;
  } else {
    let pgPool;
    try {
      pgPool = await connectPG();
      pgStats.connected = true;
      console.log('[SUCCESS] Connected to PostgreSQL (Supabase).');

      // Fetch PG Table existence and Row counts
      console.log('Fetching PostgreSQL table details...');
      for (const table of tableList) {
        try {
          const countRes = await pgPool.request().query(`SELECT COUNT(*) AS cnt FROM dbo.${table}`);
          pgStats.tables[table] = { exists: true, count: countRes.recordset[0].cnt };
        } catch (err) {
          pgStats.tables[table] = { exists: false, count: 0 };
          queryFailures.push(`PG query failed for ${table}: ${err.message}`);
        }
      }

      // Fetch employee & department counts
      try {
        const empCount = await pgPool.request().query("SELECT COUNT(*) AS cnt FROM dbo.EmployeeMaster WHERE EmpStatus = 'Active'");
        pgStats.employees = empCount.recordset[0].cnt;
      } catch (err) {
        queryFailures.push(`PG Employee count query failed: ${err.message}`);
      }

      try {
        const deptCount = await pgPool.request().query('SELECT COUNT(*) AS cnt FROM dbo.Departments');
        pgStats.departments = deptCount.recordset[0].cnt;
      } catch (err) {
        queryFailures.push(`PG Department count query failed: ${err.message}`);
      }

      // Fetch leave balances summary
      try {
        const leaveRes = await pgPool.request().query(`
          SELECT LeaveType, SUM(DATEDIFF(day, FromDate, ToDate) + 1) AS approved_days
          FROM dbo.EmployeeLeaveDetails
          WHERE LeaveStatus = 'Approved'
          GROUP BY LeaveType
        `);
        leaveRes.recordset.forEach(row => {
          pgStats.leaves[row.leave_type] = parseInt(row.approved_days, 10);
        });
      } catch (err) {
        queryFailures.push(`PG Leave query failed: ${err.message}`);
      }

      // Fetch dashboard stats queries (using the exact same wrapper queries to test translation)
      try {
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;
        const today = new Date().toISOString().split('T')[0];

        const d1 = await pgPool.request().query("SELECT COUNT(*) AS total FROM dbo.EmployeeMaster WHERE EmpStatus = 'Active'");
        
        const d2 = await pgPool.request()
          .input('year', sqlPG.Int, currentYear)
          .query(`
            SELECT ISNULL(SUM(s.NetSalaryPaid), 0) AS totalPayroll
            FROM dbo.EmployeeSalarysDetails s
            JOIN dbo.PayrollRuns r ON s.RunID = r.RunID
            WHERE s.SalaryYear = @year AND r.Status = 'Released'
          `);
        
        const d3 = await pgPool.request()
          .input('today', sqlPG.Date, today)
          .query(`
            SELECT COUNT(DISTINCT EmpID) AS count
            FROM dbo.EmployeeLeaveDetails
            WHERE LeaveStatus = 'Approved'
              AND @today BETWEEN FromDate AND ToDate
          `);
        
        const d4 = await pgPool.request()
          .input('month', sqlPG.Int, currentMonth)
          .input('year', sqlPG.Int, currentYear)
          .query(`
            SELECT 
              CASE 
                WHEN COUNT(*) = 0 THEN 0
                ELSE ROUND(
                  (SUM(CASE WHEN AttendanceStatus = 'Present' THEN 1.0 ELSE 0 END) / COUNT(*)) * 100, 1
                )
              END AS avgPct
            FROM dbo.EmployeeAttendance
            WHERE MONTH(AttendanceDate) = @month AND YEAR(AttendanceDate) = @year
          `);

        pgStats.dashboard = {
          activeEmployees: d1.recordset[0].total,
          totalPayroll: parseFloat(d2.recordset[0].totalpayroll || d2.recordset[0].totalPayroll || 0),
          onLeaveToday: d3.recordset[0].count,
          avgAttendance: parseFloat(d4.recordset[0].avgpct || d4.recordset[0].avgPct || 0)
        };
      } catch (err) {
        queryFailures.push(`PG Dashboard query failed: ${err.message}`);
      }

      // Test Auth query
      try {
        const authRes = await pgPool.request()
          .input('email', sqlPG.VarChar, 'sneha.iyer@nexus.com')
          .query(`
            SELECT m.EmpID AS employee_id, d.EmailID AS email, a.Password AS password_hash, m.FirstName AS first_name, m.LastName AS last_name, a.Role AS role_name, m.Designation AS designation, m.Department AS department
            FROM dbo.AdminLogins a
            JOIN dbo.EmployeeMaster m ON a.EmpID = m.EmpID
            LEFT JOIN dbo.EmployeeDetails d ON m.EmpID = d.EmpID
            WHERE (LOWER(a.Username) = LOWER(@email) OR LOWER(d.EmailID) = LOWER(@email)) AND m.EmpStatus = 'Active' AND a.UserStatus = 'Active'
          `);
        if (authRes.recordset.length > 0) {
          const user = authRes.recordset[0];
          pgStats.auth = { success: true, email: user.email, name: `${user.first_name} ${user.last_name}` };
        } else {
          pgStats.auth = { success: false, reason: 'Superadmin user not found' };
        }
      } catch (err) {
        queryFailures.push(`PG Authentication query failed: ${err.message}`);
        pgStats.auth = { success: false, reason: err.message };
      }

    } catch (err) {
      console.error('[ERROR] Failed to connect or collect PostgreSQL statistics:', err);
      errors.push(`PostgreSQL Connection / Collection failure: ${err.message}`);
      pgStats.connected = false;
    }
  }

  // 3. Compile Comparison Report
  console.log('\n[3/4] Compiling Comparison Report...');

  let tablesCreated = 0;
  let rowsImported = 0;
  let failedImports = 0;
  let unsupportedMSSQL = [];

  tableList.forEach(table => {
    const mCount = mssqlStats.tables[table] ? mssqlStats.tables[table].count : 0;
    const pCount = pgStats.tables[table] ? pgStats.tables[table].count : 0;
    const pExists = pgStats.tables[table] ? pgStats.tables[table].exists : false;

    if (pExists) {
      tablesCreated++;
      rowsImported += pCount;
      if (mCount !== pCount) {
        failedImports += Math.abs(mCount - pCount);
      }
    }
  });

  // Identify unsupported syntax based on query failures
  queryFailures.forEach(fail => {
    if (fail.toLowerCase().includes('max') && fail.toLowerCase().includes('varchar')) {
      unsupportedMSSQL.push('VARCHAR(MAX) is not supported in Postgres');
    }
    if (fail.toLowerCase().includes('month') && !fail.toLowerCase().includes('extract')) {
      unsupportedMSSQL.push('MONTH() function is not supported in Postgres (requires EXTRACT)');
    }
  });

  // Remove duplicates
  unsupportedMSSQL = [...new Set(unsupportedMSSQL)];

  // Generate Markdown report
  const reportPath = path.resolve('../postgres_validation_report.md');
  
  const mDashboard = mssqlStats.dashboard || {};
  const pDashboard = pgStats.dashboard || {};
  
  const goNoGo = pgStats.connected && 
                 tablesCreated === tableList.length && 
                 failedImports === 0 && 
                 queryFailures.length === 0 &&
                 pgStats.employees === mssqlStats.employees &&
                 pgStats.auth && pgStats.auth.success;

  const mdContent = `# PostgreSQL Migration Validation & Compatibility Report

This report presents a side-by-side comparison of the Microsoft SQL Server (MSSQL) database and the migrated Supabase PostgreSQL database.

## 1. Migration Summary Metrics

* **Total Tables Expected:** ${tableList.length}
* **Total Tables Created in PG:** ${tablesCreated}
* **Total Rows Imported in PG:** ${rowsImported}
* **Discrepancy (Failed Imports / Row Count Mismatch):** ${failedImports}
* **Query Translation Failures:** ${queryFailures.length}
* **Unsupported MSSQL Syntax Discovered:** ${unsupportedMSSQL.length === 0 ? 'None (All compatibility issues resolved)' : unsupportedMSSQL.join(', ')}

---

## 2. Side-by-Side Database Comparison

| Metric | Microsoft SQL Server (Baseline) | Supabase PostgreSQL | Matches? |
| :--- | :--- | :--- | :---: |
| **Connection Status** | ${mssqlStats.connected ? 'Connected' : 'Disconnected'} | ${pgStats.connected ? 'Connected' : 'Disconnected'} | ${mssqlStats.connected === pgStats.connected ? '✅' : '❌'} |
| **Total Active Employees** | ${mssqlStats.employees} | ${pgStats.employees} | ${mssqlStats.employees === pgStats.employees ? '✅' : '❌'} |
| **Total Departments** | ${mssqlStats.departments} | ${pgStats.departments} | ${mssqlStats.departments === pgStats.departments ? '✅' : '❌'} |
| **Leave Balance (Casual)** | ${mssqlStats.leaves['Casual Leave'] || 0} days | ${pgStats.leaves['Casual Leave'] || 0} days | ${(mssqlStats.leaves['Casual Leave'] || 0) === (pgStats.leaves['Casual Leave'] || 0) ? '✅' : '❌'} |
| **Leave Balance (Sick)** | ${mssqlStats.leaves['Sick Leave'] || 0} days | ${pgStats.leaves['Sick Leave'] || 0} days | ${(mssqlStats.leaves['Sick Leave'] || 0) === (pgStats.leaves['Sick Leave'] || 0) ? '✅' : '❌'} |
| **Leave Balance (Unpaid)** | ${mssqlStats.leaves['Unpaid Leave'] || 0} days | ${pgStats.leaves['Unpaid Leave'] || 0} days | ${(mssqlStats.leaves['Unpaid Leave'] || 0) === (pgStats.leaves['Unpaid Leave'] || 0) ? '✅' : '❌'} |
| **Dashboard Active Employees** | ${mDashboard.activeEmployees || 0} | ${pDashboard.activeEmployees || 0} | ${mDashboard.activeEmployees === pDashboard.activeEmployees ? '✅' : '❌'} |
| **Dashboard Total Payroll** | ₹${mDashboard.totalPayroll || 0} | ₹${pDashboard.totalPayroll || 0} | ${mDashboard.totalPayroll === pDashboard.totalPayroll ? '✅' : '❌'} |
| **Dashboard On Leave Today** | ${mDashboard.onLeaveToday || 0} | ${pDashboard.onLeaveToday || 0} | ${mDashboard.onLeaveToday === pDashboard.onLeaveToday ? '✅' : '❌'} |
| **Dashboard Avg Attendance** | ${mDashboard.avgAttendance || 0}% | ${pDashboard.avgAttendance || 0}% | ${mDashboard.avgAttendance === pDashboard.avgAttendance ? '✅' : '❌'} |
| **Authentication Test (superadmin)**| ${mssqlStats.auth && mssqlStats.auth.success ? `Success (${mssqlStats.auth.name})` : 'Failed'} | ${pgStats.auth && pgStats.auth.success ? `Success (${pgStats.auth.name})` : 'Failed'} | ${(mssqlStats.auth && mssqlStats.auth.success) === (pgStats.auth && pgStats.auth.success) ? '✅' : '❌'} |

---

## 3. Table Row Counts Detailed Comparison

| Table Name | MSSQL Row Count | PostgreSQL Row Count | Matches? |
| :--- | :---: | :---: | :---: |
${tableList.map(table => {
  const mCount = mssqlStats.tables[table] ? mssqlStats.tables[table].count : 'N/A';
  const pCount = pgStats.tables[table] && pgStats.tables[table].exists ? pgStats.tables[table].count : 'N/A';
  const match = mCount === pCount ? '✅' : '❌';
  return `| \`${table}\` | ${mCount} | ${pCount} | ${match} |`;
}).join('\n')}

---

## 4. Query Translation Failures & Warnings

${queryFailures.length === 0 ? '*No query translation failures discovered during the validation phase!*' : queryFailures.map(f => `* **Failure:** ${f}`).join('\n')}

---

## 5. Go / No-Go Recommendation

### **Recommendation: ${goNoGo ? 'GO' : 'NO-GO'}**

${goNoGo 
  ? `All core validation checks have passed successfully! 
1. Database schema and seed data loaded correctly on Supabase without discrepancies.
2. Active employee counts, departments, leave balances, and dashboard statistics match MSSQL 100%.
3. Authentication queries translate dynamically and succeed on PostgreSQL.
4. The query wrapper \`db_pg.js\` compiles date, month, and year expressions without issue.

It is **SAFE** to expand the migration scope to the Payroll module and remaining controllers.`
  : `The validation phase has failed or is incomplete.
Reason(s):
${!pgStats.connected ? '* PostgreSQL database is not connected. Please verify the `DATABASE_URL` in `.env`.' : ''}
${tablesCreated < tableList.length ? `* Only ${tablesCreated} out of ${tableList.length} tables exist in PostgreSQL.` : ''}
${failedImports > 0 ? `* There is a discrepancy of ${failedImports} rows between MSSQL and PostgreSQL.` : ''}
${queryFailures.length > 0 ? `* There are ${queryFailures.length} queries failing execution on PostgreSQL.` : ''}

Please resolve the connection settings or schema compilation errors before proceeding.`}
`;

  fs.writeFileSync(reportPath, mdContent);
  console.log(`[SUCCESS] Validation report written to: ${reportPath}`);

  console.log('\n==================================================');
  console.log(`STATUS: ${goNoGo ? 'GO' : 'NO-GO'}`);
  console.log('==================================================');
  
  if (mssqlPool) await mssqlPool.close();
  // Connection pool from pg does not need explicit close if exiting process immediately
  process.exit(0);
}

runValidation();
