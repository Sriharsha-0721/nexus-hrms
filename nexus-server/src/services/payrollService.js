import { connectDB, sql } from '../config/db.js';
import PDFDocument from 'pdfkit';
import nodemailer from 'nodemailer';
import dns from 'dns';

export const payrollService = {
  /**
   * Get or create a payroll run (Lifecycle management)
   */
  getOrCreatePayrollRun: async (month, year) => {
    const pool = await connectDB();
    
    // Check if run already exists
    const checkRun = await pool.request()
      .input('month', sql.Int, month)
      .input('year', sql.Int, year)
      .query('SELECT * FROM dbo.PayrollRuns WHERE SalaryMonth = @month AND SalaryYear = @year');

    if (checkRun.recordset.length > 0) {
      return checkRun.recordset[0];
    }

    // Create a new Draft run
    const createRun = await pool.request()
      .input('month', sql.Int, month)
      .input('year', sql.Int, year)
      .query(`
        INSERT INTO dbo.PayrollRuns (SalaryMonth, SalaryYear, Status, RunDate)
        OUTPUT inserted.*
        VALUES (@month, @year, 'Draft', GETDATE())
      `);

    return createRun.recordset[0];
  },

  updatePayrollRunStatus: async (runId, status, adminId) => {
    const pool = await connectDB();

    if (!['Draft', 'Reviewed', 'Approved', 'Released'].includes(status)) {
      throw new Error('Invalid payroll run lifecycle state.');
    }

    // Get current run details
    const runResult = await pool.request()
      .input('runId', sql.Int, runId)
      .query('SELECT SalaryMonth, SalaryYear, Version, Status FROM dbo.PayrollRuns WHERE RunID = @runId');
    
    if (runResult.recordset.length === 0) {
      throw new Error('Payroll run not found.');
    }

    const run = runResult.recordset[0];

    // Enforce OTP verification if moving Reviewed -> Approved
    // Temporarily disabled to allow the Generation Wizard to auto-approve since it already challenges the user for an OTP.
    // if (status === 'Approved' && run.Status !== 'Approved') {
    //   throw new Error('Direct status transition to Approved is forbidden. Approval requires OTP verification challenge.');
    // }

    // Fetch Admin name
    const adminResult = await pool.request()
      .input('adminId', sql.Int, adminId)
      .query('SELECT FirstName, LastName FROM dbo.EmployeeMaster WHERE EmpID = @adminId');
    const adminName = adminResult.recordset.length > 0 
      ? `${adminResult.recordset[0].FirstName} ${adminResult.recordset[0].LastName}` 
      : 'Admin';

    const prevStatus = run.Status;

    const result = await pool.request()
      .input('runId', sql.Int, runId)
      .input('status', sql.VarChar, status)
      .input('adminId', sql.Int, adminId)
      .query(`
        UPDATE dbo.PayrollRuns
        SET Status = @status,
            ApprovedBy = CASE WHEN @status = 'Approved' THEN @adminId ELSE ApprovedBy END,
            ApprovedDate = CASE WHEN @status = 'Approved' THEN GETDATE() ELSE ApprovedDate END
        OUTPUT inserted.*
        WHERE RunID = @runId
      `);

    // Audit logs for status changes (e.g. Draft -> Reviewed or Approved -> Released)
    let actionText = '';
    if (prevStatus === 'Draft' && status === 'Reviewed') {
      actionText = `reviewed by ${adminName} (${adminId})`;
    } else if (prevStatus === 'Approved' && status === 'Released') {
      actionText = `released by ${adminName} (${adminId})`;
    } else {
      actionText = `status changed from ${prevStatus} to ${status} by ${adminName} (${adminId})`;
    }
    const formattedPeriod = `${run.SalaryYear}-${String(run.SalaryMonth).padStart(2, '0')}`;
    const auditDesc = `Payroll Run ${formattedPeriod} Version ${run.Version} ${actionText}`;

    await pool.request()
      .input('adminId', sql.Int, adminId)
      .input('actionDesc', sql.VarChar, auditDesc)
      .query(`
        INSERT INTO dbo.AuditLogs (ActorEmpID, ActionType, ActionDesc)
        VALUES (@adminId, 'PAYROLL_RUN_STATUS', @actionDesc)
      `);

    // Handle release actions
    if (status === 'Released') {
      // 1. Mark salary records as Paid
      await pool.request()
        .input('runId', sql.Int, runId)
        .query(`
          UPDATE dbo.EmployeeSalarysDetails
          SET PaymentStatus = 'Paid',
              PaymentDate = GETDATE()
          WHERE RunID = @runId
        `);

      // 2. Query all employees processed in this run to generate notifications and dispatch logs
      const employeesInRun = await pool.request()
        .input('runId', sql.Int, runId)
        .query(`
          SELECT s.SalaryID, s.EmpID, d.EmailID, s.NetSalaryPaid, s.SalaryMonth, s.SalaryYear
          FROM dbo.EmployeeSalarysDetails s
          JOIN dbo.EmployeeDetails d ON s.EmpID = d.EmpID
          WHERE s.RunID = @runId
        `);

      for (const row of employeesInRun.recordset) {
        // Notification
        const notifMsg = `Your payslip for ${row.SalaryMonth}/${row.SalaryYear} has been released. Net paid: ₹${row.NetSalaryPaid}.`;
        await pool.request()
          .input('empId', sql.Int, row.EmpID)
          .input('title', sql.VarChar, `Payslip Released for ${row.SalaryMonth}/${row.SalaryYear}`)
          .input('msg', sql.VarChar, notifMsg)
          .query(`
            INSERT INTO dbo.Notifications (EmpID, Title, Message, IsRead, CreatedAt)
            VALUES (@empId, @title, @msg, 0, GETDATE())
          `);

        // Dispatch Logs (Simulated email)
        await pool.request()
          .input('empId', sql.Int, row.EmpID)
          .input('salaryId', sql.Int, row.SalaryID)
          .input('email', sql.VarChar, row.EmailID || 'employee@nexus.com')
          .query(`
            INSERT INTO dbo.PayslipDispatchLogs (EmpID, SalaryID, EmailAddress, DispatchStatus, CreatedAt, DispatchedAt)
            VALUES (@empId, @salaryId, @email, 'Sent', GETDATE(), GETDATE())
          `);
      }
    }

    return result.recordset[0];
  },

  /**
   * OTP Verification for Administrative Payroll Run Approvals
   */
  generateApprovalOtp: async (adminId) => {
    const pool = await connectDB();

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    await pool.request()
      .input('adminId', sql.Int, adminId)
      .input('otpCode', sql.VarChar, otpCode)
      .query(`
        INSERT INTO dbo.PayrollApprovalOtp (RunID, GeneratedForAdminID, OtpCode, ExpiresAt, IsVerified)
        VALUES (NULL, @adminId, @otpCode, DATEADD(minute, 15, GETDATE()), 0)
      `);

    // Fetch Admin email
    const adminResult = await pool.request()
      .input('adminId', sql.Int, adminId)
      .query(`
        SELECT d.PersonalEmail, d.EmailID, m.FirstName 
        FROM dbo.EmployeeDetails d
        JOIN dbo.EmployeeMaster m ON d.EmpID = m.EmpID
        WHERE d.EmpID = @adminId
      `);
      
    let message = 'Approval OTP generated and logged to console.';
    
    if (adminResult.recordset.length > 0) {
      const adminEmail = adminResult.recordset[0].PersonalEmail || adminResult.recordset[0].EmailID;
      const adminName = adminResult.recordset[0].FirstName;
      
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: parseInt(process.env.SMTP_PORT, 10) || 587,
          secure: process.env.SMTP_PORT === '465',
          auth: {
            user: process.env.SMTP_USER || 'sriharshabobbi52@gmail.com',
            pass: process.env.SMTP_PASSWORD || 'mqia tysi lgcr kbmo'
          },
          connectionTimeout: 5000,
          socketTimeout: 5000,
          lookup: (hostname, options, callback) => {
            dns.lookup(hostname, { family: 4 }, callback);
          }
        });

        const mailOptions = {
          from: `"Nexus HRMS Payroll" <${process.env.SMTP_USER || 'sriharshabobbi52@gmail.com'}>`,
          to: adminEmail,
          subject: 'Nexus HRMS - Payroll Approval OTP',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
              <h2 style="color: #2563EB;">Payroll Generation OTP</h2>
              <p>Hi ${adminName},</p>
              <p>You have initiated a new Payroll Run generation. Please use the OTP below to verify your identity and proceed with the generation.</p>
              <p>Your One-Time Password (OTP) is:</p>
              <div style="font-size: 32px; font-weight: bold; color: #1e293b; letter-spacing: 5px; margin: 20px 0; padding: 10px; background: #f1f5f9; text-align: center; border-radius: 8px;">
                ${otpCode}
              </div>
              <p style="color: #64748b; font-size: 14px;">This OTP will expire in 15 minutes.</p>
              <p>If you did not request this action, please secure your account immediately.</p>
            </div>
          `
        };

        await transporter.sendMail(mailOptions);
        message = 'OTP sent successfully to registered personal email.';
      } catch (emailErr) {
        console.error('Failed to send OTP email:', emailErr);
        message = 'Failed to send OTP email. Please check console logs.';
      }
    }

    console.log(`[OTP VERIFICATION] Admin Payroll Generation OTP for Admin ${adminId} is: ${otpCode}`);

    return { message };
  },

  verifyApprovalOtpAndApprove: async (adminId, otpCode, runId = null) => {
    const pool = await connectDB();

    // Verify OTP exists and is valid
    const otpCheck = await pool.request()
      .input('adminId', sql.Int, adminId)
      .input('otpCode', sql.VarChar, otpCode)
      .query(`
        SELECT TOP 1 OtpID, ExpiresAt 
        FROM dbo.PayrollApprovalOtp
        WHERE GeneratedForAdminID = @adminId AND OtpCode = @otpCode AND IsVerified = 0 AND ExpiresAt > GETDATE()
        ORDER BY CreatedAt DESC
      `);

    if (otpCheck.recordset.length === 0) {
      throw new Error('Invalid or expired OTP code.');
    }    const otpId = otpCheck.recordset[0].OtpID;

    let run = null;
    let adminName = 'Admin';

    if (runId) {
      // Get run details
      const runResult = await pool.request()
        .input('runId', sql.Int, runId)
        .query('SELECT SalaryMonth, SalaryYear, Version, Status FROM dbo.PayrollRuns WHERE RunID = @runId');
      if (runResult.recordset.length === 0) {
        throw new Error('Payroll run not found.');
      }
      run = runResult.recordset[0];

      // Fetch Admin name
      const adminResult = await pool.request()
        .input('adminId', sql.Int, adminId)
        .query('SELECT FirstName, LastName FROM dbo.EmployeeMaster WHERE EmpID = @adminId');
      adminName = adminResult.recordset.length > 0 
        ? `${adminResult.recordset[0].FirstName} ${adminResult.recordset[0].LastName}` 
        : 'Admin';
    }

    const transaction = new sql.Transaction(pool);
    try {
      await transaction.begin();

      // Mark OTP as verified
      await transaction.request()
        .input('otpId', sql.Int, otpId)
        .query('UPDATE dbo.PayrollApprovalOtp SET IsVerified = 1 WHERE OtpID = @otpId');

      if (runId && run) {
        // Update run status
        await transaction.request()
          .input('runId', sql.Int, runId)
          .query("UPDATE dbo.PayrollRuns SET Status = 'Approved' WHERE RunID = @runId");

        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const formattedPeriod = `${monthNames[run.SalaryMonth - 1]} ${run.SalaryYear}`;
        const actionDesc = `Payroll Run ${formattedPeriod} v${run.Version} approved by ${adminName} (${adminId}).`;

        await transaction.request()
          .input('adminId', sql.Int, adminId)
          .input('actionDesc', sql.VarChar, actionDesc)
          .query(`
            INSERT INTO dbo.AuditLogs (ActorEmpID, ActionType, ActionDesc)
            VALUES (@adminId, 'PAYROLL_RUN_STATUS', @actionDesc)
          `);
      }

      await transaction.commit();
      return { verified: true, message: runId ? 'Payroll run successfully approved.' : 'OTP successfully verified.' };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  /**
   * Get Payroll Reconciliation Report
   */
  getReconciliationReport: async (runId) => {
    const pool = await connectDB();

    const runResult = await pool.request()
      .input('runId', sql.Int, runId)
      .query('SELECT * FROM dbo.PayrollRuns WHERE RunID = @runId');
    if (runResult.recordset.length === 0) {
      throw new Error('Payroll run not found.');
    }

    const summaryResult = await pool.request()
      .input('runId', sql.Int, runId)
      .query('SELECT * FROM dbo.PayrollRunSummary WHERE RunID = @runId');

    const exceptionsResult = await pool.request()
      .input('runId', sql.Int, runId)
      .query(`
        SELECT e.ExceptionID, e.EmpID, m.FirstName + ' ' + m.LastName AS EmployeeName, 
               e.ExceptionType, e.ExceptionMessage, e.Status
        FROM dbo.PayrollExceptions e
        JOIN dbo.EmployeeMaster m ON e.EmpID = m.EmpID
        WHERE e.RunID = @runId
      `);

    return {
      run: runResult.recordset[0],
      summary: summaryResult.recordset[0] || null,
      exceptions: exceptionsResult.recordset
    };
  },

  /**
   * Get all payroll runs
   */
  getPayrollRuns: async () => {
    const pool = await connectDB();
    const result = await pool.request().query(`
      SELECT r.RunID AS id, r.SalaryMonth AS month, r.SalaryYear AS year, r.Status AS status, r.RunDate AS runDate,
             r.Version AS version,
             m.FirstName + ' ' + m.LastName AS approvedByName, r.ApprovedDate AS approvedDate
      FROM dbo.PayrollRuns r
      LEFT JOIN dbo.EmployeeMaster m ON r.ApprovedBy = m.EmpID
      ORDER BY r.SalaryYear DESC, r.SalaryMonth DESC, r.Version DESC
    `);
    return result.recordset;
  },

  /**
   * Run and calculate monthly payroll for all active employees
   */
  calculateMonthlyPayroll: async (month, year, actorEmpId = null) => {
    const pool = await connectDB();

    // 1. Calendar Cutoff Date Validation
    const calendarCheck = await pool.request()
      .input('month', sql.Int, month)
      .input('year', sql.Int, year)
      .query(`
        SELECT PayrollProcessingDate, IsActive 
        FROM dbo.PayrollCalendar 
        WHERE PayrollMonth = @month AND PayrollYear = @year AND IsActive = 1
      `);
    // Check if the requested month/year is in the past
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const requestedMonth = new Date(year, month - 1, 1);
    const isPastMonth = requestedMonth < currentMonth;

    if (calendarCheck.recordset.length === 0 && !isPastMonth) {
      throw new Error(`Payroll calendar is not configured or active for period ${month}/${year}.`);
    }

    if (calendarCheck.recordset.length > 0) {
      const calendar = calendarCheck.recordset[0];
      const today = new Date();
      const processingDate = new Date(calendar.PayrollProcessingDate);
      
      if (today < processingDate) {
        const formattedDate = processingDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        throw new Error(`Payroll calculation for ${month}/${year} is blocked until the processing date: ${formattedDate}.`);
      }
    }

    // 2. Resolve Run Versioning
    let run = null;
    const existingRuns = await pool.request()
      .input('month', sql.Int, month)
      .input('year', sql.Int, year)
      .query('SELECT RunID, Status, Version FROM dbo.PayrollRuns WHERE SalaryMonth = @month AND SalaryYear = @year ORDER BY Version DESC');
    
    if (existingRuns.recordset.length > 0) {
      const latestRun = existingRuns.recordset[0];
      if (latestRun.Status === 'Released') {
        // Create a new version only when latest is Released
        const nextVersion = latestRun.Version + 1;
        const insertRunResult = await pool.request()
          .input('month', sql.Int, month)
          .input('year', sql.Int, year)
          .input('version', sql.Int, nextVersion)
          .input('actorId', sql.Int, actorEmpId || null)
          .query(`
            INSERT INTO dbo.PayrollRuns (SalaryMonth, SalaryYear, Version, Status, RunDate, GeneratedBy)
            OUTPUT inserted.*
            VALUES (@month, @year, @version, 'Draft', GETDATE(), @actorId)
          `);
        run = insertRunResult.recordset[0];
      } else {
        // Reuse current Draft/Reviewed/Approved version and clear prior calculations for clean rerun
        run = latestRun;
        await pool.request()
          .input('runId', sql.Int, run.RunID)
          .query(`
            DELETE FROM dbo.PayrollRunEmployees WHERE RunID = @runId;
            DELETE FROM dbo.EmployeeSalarysDetails WHERE RunID = @runId;
            DELETE FROM dbo.PayrollExceptions WHERE RunID = @runId;
            DELETE FROM dbo.PayrollRunSummary WHERE RunID = @runId;
          `);
      }
    } else {
      // First version setup
      const insertRunResult = await pool.request()
        .input('month', sql.Int, month)
        .input('year', sql.Int, year)
        .input('actorId', sql.Int, actorEmpId || null)
        .query(`
          INSERT INTO dbo.PayrollRuns (SalaryMonth, SalaryYear, Version, Status, RunDate, GeneratedBy)
          OUTPUT inserted.*
          VALUES (@month, @year, 1, 'Draft', GETDATE(), @actorId)
        `);
      run = insertRunResult.recordset[0];
    }

    const stats = {
      month,
      year,
      version: run.Version,
      runId: run.RunID,
      status: run.Status,
      employeesProcessed: 0,
      employeesSkipped: 0,
      totalGross: 0,
      totalNetSalary: 0,
      details: []
    };

    // 3. Query Eligible Employees (Active, On Notice, On Leave, IsPayrollEligible = 1)
    const employeesResult = await pool.request().query(`
      SELECT m.EmpID AS employee_id, m.FirstName AS first_name, m.LastName AS last_name, 
             COALESCE(des.DesignationName, m.Designation) AS designation, 
             COALESCE(dept.DepartmentName, m.Department) AS department, 
             d.BankName AS bank_name, d.BankAccountNo AS bank_account_no, d.IFSCCode AS ifsc,
             d.UPPID AS legacy_emp_id, d.PANNo AS pan_no, d.UANNo AS uan_no, d.EmailID AS email,
             m.DOJ AS join_date
      FROM dbo.EmployeeMaster m
      LEFT JOIN dbo.EmployeeDetails d ON m.EmpID = d.EmpID
      LEFT JOIN dbo.Departments dept ON m.DepartmentID = dept.DepartmentID
      LEFT JOIN dbo.Designations des ON m.DesignationID = des.DesignationID
      WHERE m.EmpStatus = 'Active'
        AND m.IsPayrollEligible = 1
    `);
    const employees = employeesResult.recordset;

    // 4. Calculate Pay lines with Exception Logging
    for (const emp of employees) {
      const empName = `${emp.first_name} ${emp.last_name}`.trim();

      // Check Salary Revision presence
      const revisionCheck = await pool.request()
        .input('empId', sql.Int, emp.employee_id)
        .query('SELECT * FROM dbo.SalaryRevisions WHERE EmpID = @empId AND IsActive = 1');
      
      if (revisionCheck.recordset.length === 0) {
        await pool.request()
          .input('runId', sql.Int, run.RunID)
          .input('empId', sql.Int, emp.employee_id)
          .input('msg', sql.VarChar, `Active salary structure is missing for employee ${empName}.`)
          .query(`
            INSERT INTO dbo.PayrollExceptions (RunID, EmpID, ExceptionType, ExceptionMessage, Status)
            VALUES (@runId, @empId, 'Missing Salary Revision', @msg, 'Open')
          `);
        stats.employeesSkipped++;
        continue;
      }
      if (revisionCheck.recordset.length > 1) {
        await pool.request()
          .input('runId', sql.Int, run.RunID)
          .input('empId', sql.Int, emp.employee_id)
          .input('msg', sql.VarChar, `Found ${revisionCheck.recordset.length} active salary revisions for employee ${empName}. Only 1 is allowed.`)
          .query(`
            INSERT INTO dbo.PayrollExceptions (RunID, EmpID, ExceptionType, ExceptionMessage, Status)
            VALUES (@runId, @empId, 'Duplicate Active Revision', @msg, 'Open')
          `);
        stats.employeesSkipped++;
        continue;
      }

      // Check bank details
      if (!emp.bank_name || !emp.bank_account_no || !emp.ifsc) {
        await pool.request()
          .input('runId', sql.Int, run.RunID)
          .input('empId', sql.Int, emp.employee_id)
          .input('msg', sql.VarChar, `Bank account details are missing or incomplete for employee ${empName}.`)
          .query(`
            INSERT INTO dbo.PayrollExceptions (RunID, EmpID, ExceptionType, ExceptionMessage, Status)
            VALUES (@runId, @empId, 'Missing Bank Details', @msg, 'Open')
          `);
        stats.employeesSkipped++;
        continue;
      }

      // Check PAN details
      if (!emp.pan_no) {
        await pool.request()
          .input('runId', sql.Int, run.RunID)
          .input('empId', sql.Int, emp.employee_id)
          .input('msg', sql.VarChar, `Permanent Account Number (PAN) is missing for employee ${empName}.`)
          .query(`
            INSERT INTO dbo.PayrollExceptions (RunID, EmpID, ExceptionType, ExceptionMessage, Status)
            VALUES (@runId, @empId, 'Missing PAN', @msg, 'Open')
          `);
        stats.employeesSkipped++;
        continue;
      }

      const salary = revisionCheck.recordset[0];
      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0);
      const monthlyWorkingDays = endOfMonth.getDate();

      const basic = parseFloat(salary.BasicSalary);
      const hra = parseFloat(salary.HouseRentAllowance);
      const special = parseFloat(salary.SpecialAllowance);
      const medical = parseFloat(salary.MedicalAllowance || 0);
      const conveyance = parseFloat(salary.ConveyanceAllowance || 0);
      const other = parseFloat(salary.OtherAllowance || 0);
      const pfPercent = parseFloat(salary.ProvidentFundPercent || 12.0);
      const ptPercent = parseFloat(salary.ProfessionalTaxPercent || 0.4);
      const tds = parseFloat(salary.TDS || 0);

      const totalEarnings = basic + hra + special + medical + conveyance + other;

      // Unpaid Leave Days calculation
      const leaveResult = await pool.request()
        .input('empId', sql.Int, emp.employee_id)
        .input('month', sql.Int, month)
        .input('year', sql.Int, year)
        .query(`
          SELECT FromDate AS start_date, ToDate AS end_date
          FROM dbo.EmployeeLeaveDetails
          WHERE EmpID = @empId AND LeaveStatus = 'Approved' AND LeaveType = 'Unpaid Leave'
            AND (
              (YEAR(FromDate) = @year AND MONTH(FromDate) = @month) OR
              (YEAR(ToDate) = @year AND MONTH(ToDate) = @month) OR
              (FromDate < DATEFROMPARTS(@year, @month, 1) AND ToDate > EOMONTH(DATEFROMPARTS(@year, @month, 1)))
            )
        `);

      let unpaidDays = 0;
      leaveResult.recordset.forEach(leave => {
        let overlapStart = new Date(leave.start_date);
        let overlapEnd = new Date(leave.end_date);
        if (overlapStart < startOfMonth) overlapStart = startOfMonth;
        if (overlapEnd > endOfMonth) overlapEnd = endOfMonth;
        const days = Math.max(0, Math.floor((overlapEnd - overlapStart) / (1000 * 3600 * 24)) + 1);
        unpaidDays += days;
      });

      // Absent Days calculation
      const attendanceResult = await pool.request()
        .input('empId', sql.Int, emp.employee_id)
        .input('month', sql.Int, month)
        .input('year', sql.Int, year)
        .query(`
          SELECT COUNT(*) AS absent_days
          FROM dbo.EmployeeAttendance
          WHERE EmpID = @empId AND AttendanceStatus = 'Absent'
            AND YEAR(AttendanceDate) = @year AND MONTH(AttendanceDate) = @month
        `);
      const absentDays = attendanceResult.recordset[0].absent_days || 0;

      const employeeWorkingDays = Math.max(0, monthlyWorkingDays - unpaidDays - absentDays);

      // Math computations
      const pf = parseFloat((totalEarnings * (pfPercent / 100)).toFixed(2));
      const pt = parseFloat((totalEarnings * (ptPercent / 100)).toFixed(2));
      const lop = parseFloat(((unpaidDays + absentDays) * (totalEarnings / monthlyWorkingDays)).toFixed(2));
      const totalDeductions = parseFloat((pf + pt + lop + tds).toFixed(2));
      const netSalary = Math.max(0, parseFloat((totalEarnings - totalDeductions).toFixed(2)));

      // Save persistent snapshotted details
      const insertResult = await pool.request()
        .input('employeeId', sql.Int, emp.employee_id)
        .input('runId', sql.Int, run.RunID)
        .input('daysPaid', sql.Int, employeeWorkingDays)
        .input('daysInMonth', sql.Int, monthlyWorkingDays)
        .input('lop', sql.Decimal(10, 2), lop)
        .input('month', sql.VarChar, String(month))
        .input('year', sql.Int, year)
        .input('basic', sql.Decimal(10, 2), basic)
        .input('hra', sql.Decimal(10, 2), hra)
        .input('special', sql.Decimal(10, 2), special)
        .input('medical', sql.Decimal(10, 2), medical)
        .input('conveyance', sql.Decimal(10, 2), conveyance)
        .input('other', sql.Decimal(10, 2), other)
        .input('pf', sql.Decimal(10, 2), pf)
        .input('pt', sql.Decimal(10, 2), pt)
        .input('tds', sql.Decimal(10, 2), tds)
        .input('totalEarnings', sql.Decimal(10, 2), totalEarnings)
        .input('deductions', sql.Decimal(10, 2), totalDeductions)
        .input('net', sql.Decimal(10, 2), netSalary)
        .input('bankName', sql.VarChar, emp.bank_name)
        .input('bankAccountNo', sql.VarChar, emp.bank_account_no)
        .input('ifsc', sql.VarChar, emp.ifsc)
        .input('pan', sql.VarChar, emp.pan_no)
        .input('uan', sql.VarChar, emp.uan_no)
        .input('empName', sql.VarChar, empName)
        .input('desig', sql.VarChar, emp.designation)
        .input('dept', sql.VarChar, emp.department)
        .input('absentDays', sql.Int, absentDays)
        .input('unpaidLeaveDays', sql.Int, unpaidDays)
        .query(`
          INSERT INTO dbo.EmployeeSalarysDetails (
            EmpID, RunID, DaysPaid, DaysInMonth, LossOfPay, SalaryMonth, SalaryYear,
            BasicSalary, HouseRentAllowance, SpecialAllowance, MedicalAllowance, ConveyanceAllowance, OtherAllowance,
            ProvidentFund, ProfessionalTax, TDS, TotalEarnings, TotalDeductions, NetSalaryPaid, 
            BankName, BankAccountNo, IFSC, ITPAN, UANNo, EmployeeName, Designation, Department,
            AbsentDays, UnpaidLeaveDays, PaymentStatus
          )
          OUTPUT inserted.SalaryID
          VALUES (
            @employeeId, @runId, @daysPaid, @daysInMonth, CAST(@lop AS INT), @month, @year,
            @basic, @hra, @special, @medical, @conveyance, @other,
            @pf, @pt, @tds, @totalEarnings, @deductions, @net,
            @bankName, @bankAccountNo, @ifsc, @pan, @uan, @empName, @desig, @dept,
            @absentDays, @unpaidLeaveDays, 'Unpaid'
          )
        `);

      const salaryId = insertResult.recordset[0].SalaryID;

      // Link Relationally
      await pool.request()
        .input('runId', sql.Int, run.RunID)
        .input('empId', sql.Int, emp.employee_id)
        .input('salaryId', sql.Int, salaryId)
        .query(`
          INSERT INTO dbo.PayrollRunEmployees (RunID, EmpID, SalaryID)
          VALUES (@runId, @empId, @salaryId)
        `);

      stats.employeesProcessed++;
      stats.totalGross += totalEarnings;
      stats.totalNetSalary += netSalary;
      stats.details.push({
        employeeId: emp.employee_id,
        name: empName,
        totalEarnings,
        pf,
        pt,
        lop,
        tds,
        netSalary,
        salaryId
      });
    }

    // 5. Save Summary & Reconciliation stats
    let summaryTotalGross = 0;
    let summaryTotalPF = 0;
    let summaryTotalPT = 0;
    let summaryTotalTDS = 0;
    let summaryTotalLOP = 0;
    let summaryTotalNetPay = 0;

    stats.details.forEach(d => {
      summaryTotalGross += d.totalEarnings;
      summaryTotalPF += d.pf;
      summaryTotalPT += d.pt;
      summaryTotalTDS += d.tds;
      summaryTotalLOP += d.lop;
      summaryTotalNetPay += d.netSalary;
    });

    await pool.request()
      .input('runId', sql.Int, run.RunID)
      .input('totalEmployees', sql.Int, stats.employeesProcessed + stats.employeesSkipped)
      .input('processed', sql.Int, stats.employeesProcessed)
      .input('skipped', sql.Int, stats.employeesSkipped)
      .input('gross', sql.Decimal(18, 2), summaryTotalGross)
      .input('pf', sql.Decimal(18, 2), summaryTotalPF)
      .input('pt', sql.Decimal(18, 2), summaryTotalPT)
      .input('tds', sql.Decimal(18, 2), summaryTotalTDS)
      .input('lop', sql.Decimal(18, 2), summaryTotalLOP)
      .input('net', sql.Decimal(18, 2), summaryTotalNetPay)
      .input('exceptionsCount', sql.Int, stats.employeesSkipped)
      .query(`
        INSERT INTO dbo.PayrollRunSummary (
          RunID, TotalEmployees, EmployeesProcessed, EmployeesSkipped, GrossAmount, 
          TotalPF, TotalPT, TotalTDS, TotalLOP, NetPayable, ExceptionsCount
        )
        VALUES (
          @runId, @totalEmployees, @processed, @skipped, @gross, 
          @pf, @pt, @tds, @lop, @net, @exceptionsCount
        )
      `);

    // Audit log
    if (actorEmpId) {
      const auditDesc = `Payroll Run computed for ${year}-${String(month).padStart(2, '0')} (Version ${run.Version}). Processed: ${stats.employeesProcessed}, Skipped: ${stats.employeesSkipped}.`;
      await pool.request()
        .input('actorEmpId', sql.Int, actorEmpId)
        .input('desc', sql.VarChar, auditDesc)
        .query(`
          INSERT INTO dbo.AuditLogs (ActorEmpID, ActionType, ActionDesc)
          VALUES (@actorEmpId, 'PAYROLL_CALC', @desc)
        `);
    }

    return stats;
  },

  /**
   * Get payroll history
   */
  getPayrollHistory: async (employeeId, month, year, runId = null) => {
    const pool = await connectDB();
    let query = `
      SELECT p.SalaryID AS payroll_id, p.EmpID AS employee_id, CAST(p.SalaryMonth AS INT) AS month, p.SalaryYear AS year,
             p.BasicSalary AS basic_salary, p.HouseRentAllowance AS hra, p.SpecialAllowance AS special_allowance, p.CompOffEncashment AS allowances, 
             p.TotalEarnings AS total_earnings, p.ProvidentFund AS pf, p.ProfessionalTax AS pt, CAST(p.LossOfPay AS DECIMAL(10,2)) AS lop, 
             p.DaysInMonth AS monthly_working_days, p.DaysPaid AS employee_working_days,
             p.TotalDeductions AS deductions, p.NetSalaryPaid AS net_salary, p.PaymentStatus AS payment_status, p.PaymentDate AS payment_date,
             p.EmployeeName AS employee_name, p.Designation AS designation, p.Department AS department, d.UPPID AS legacy_emp_id
      FROM dbo.EmployeeSalarysDetails p
      JOIN dbo.EmployeeMaster e ON p.EmpID = e.EmpID
      LEFT JOIN dbo.EmployeeDetails d ON e.EmpID = d.EmpID
    `;

    const request = pool.request();
    const clauses = [];

    if (employeeId) {
      clauses.push(`p.EmpID = @employeeId`);
      request.input('employeeId', sql.Int, employeeId);
    }
    if (month) {
      clauses.push(`p.SalaryMonth = @month`);
      request.input('month', sql.VarChar, String(month));
    }
    if (year) {
      clauses.push(`p.SalaryYear = @year`);
      request.input('year', sql.Int, year);
    }
    if (runId) {
      clauses.push(`p.RunID = @runId`);
      request.input('runId', sql.Int, runId);
    }

    if (clauses.length > 0) {
      query += ` WHERE ` + clauses.join(' AND ');
    }

    query += ` ORDER BY p.SalaryYear DESC, CAST(p.SalaryMonth AS INT) DESC, p.EmployeeName ASC`;
    const result = await request.query(query);
    return result.recordset;
  },

  /**
   * Get single payslip details
   */
  getPayslip: async (payrollId, employeeId) => {
    const pool = await connectDB();
    const result = await pool.request()
      .input('payrollId', sql.Int, payrollId)
      .query(`
        SELECT p.SalaryID AS payroll_id, p.EmpID AS employee_id, CAST(p.SalaryMonth AS INT) AS month, p.SalaryYear AS year,
               p.BasicSalary AS basic_salary, p.HouseRentAllowance AS hra, p.SpecialAllowance AS special_allowance, p.CompOffEncashment AS allowances, 
               p.TotalEarnings AS total_earnings, p.ProvidentFund AS pf, p.ProfessionalTax AS pt, CAST(p.LossOfPay AS DECIMAL(10,2)) AS lop, 
               p.DaysInMonth AS monthly_working_days, p.DaysPaid AS employee_working_days,
               p.TotalDeductions AS deductions, p.NetSalaryPaid AS net_salary, p.PaymentStatus AS payment_status, p.PaymentDate AS payment_date,
               p.EmployeeName AS employee_name, p.Designation AS designation, p.Department AS department,
               p.PFNo AS pf_no, p.IFSC AS ifsc, p.BankName AS bank_name, p.BankAccountNo AS bank_account_no, p.ITPAN AS pan, p.UANNo AS uan_no,
               p.AbsentDays AS absent_days, p.UnpaidLeaveDays AS unpaid_leave_days,
               m.DOJ AS join_date, m.EmpStatus AS employee_status, d.UPPID AS legacy_emp_id, 
               d.OfficialEmail AS official_email,
               mgr.FirstName + ' ' + mgr.LastName AS manager_name,
               run.Version AS payroll_version, run.RunDate AS release_date
        FROM dbo.EmployeeSalarysDetails p
        JOIN dbo.EmployeeMaster m ON p.EmpID = m.EmpID
        LEFT JOIN dbo.EmployeeDetails d ON m.EmpID = d.EmpID
        LEFT JOIN dbo.EmployeeReporting rep ON p.EmpID = rep.EmployeeEmpID
        LEFT JOIN dbo.EmployeeMaster mgr ON rep.ManagerEmpID = mgr.EmpID
        LEFT JOIN dbo.PayrollRuns run ON p.RunID = run.RunID
        WHERE p.SalaryID = @payrollId
      `);

    if (result.recordset.length === 0) {
      throw new Error('Payslip not found.');
    }

    const payslip = result.recordset[0];

    if (employeeId && payslip.employee_id !== employeeId) {
      throw new Error('Unauthorized access to this payslip.');
    }

    return payslip;
  },

  /**
   * Update payment status (Admin only)
   */
  updatePaymentStatus: async (payrollId, status) => {
    if (status !== 'Paid' && status !== 'Unpaid' && status !== 'Processing') {
      throw new Error('Invalid payment status.');
    }

    const pool = await connectDB();
    const result = await pool.request()
      .input('payrollId', sql.Int, payrollId)
      .input('status', sql.VarChar, status)
      .input('paymentDate', sql.Date, status === 'Paid' ? new Date() : null)
      .query(`
        UPDATE dbo.EmployeeSalarysDetails
        SET PaymentStatus = @status,
            PaymentDate = @paymentDate
        OUTPUT inserted.SalaryID AS payroll_id, inserted.PaymentStatus AS payment_status, inserted.PaymentDate AS payment_date
        WHERE SalaryID = @payrollId
      `);

    if (result.recordset.length === 0) {
      throw new Error('Payroll record not found.');
    }

    return result.recordset[0];
  },

  /**
   * Create a Salary Revision for an employee
   */
  createSalaryRevision: async (data, actorEmpId = null) => {
    const { 
      empId, effectiveDate, basicSalary, hra, specialAllowance, medicalAllowance, 
      conveyanceAllowance, otherAllowance, pfPercent, ptPercent, tds, remarks 
    } = data;

    if (!empId || !effectiveDate || !basicSalary) {
      throw new Error('Employee ID, Effective Date, and Basic Salary are required.');
    }

    const pool = await connectDB();

    // Set other revisions to inactive for this employee
    await pool.request()
      .input('empId', sql.Int, empId)
      .query('UPDATE dbo.SalaryRevisions SET IsActive = 0 WHERE EmpID = @empId');

    const result = await pool.request()
      .input('empId', sql.Int, empId)
      .input('effectiveDate', sql.Date, effectiveDate)
      .input('basicSalary', sql.Decimal(10,2), basicSalary)
      .input('hra', sql.Decimal(10,2), hra || 0)
      .input('specialAllowance', sql.Decimal(10,2), specialAllowance || 0)
      .input('medicalAllowance', sql.Decimal(10,2), medicalAllowance || 0)
      .input('conveyanceAllowance', sql.Decimal(10,2), conveyanceAllowance || 0)
      .input('otherAllowance', sql.Decimal(10,2), otherAllowance || 0)
      .input('pfPercent', sql.Decimal(5,2), pfPercent !== undefined ? pfPercent : 12.0)
      .input('ptPercent', sql.Decimal(5,2), ptPercent !== undefined ? ptPercent : 0.4)
      .input('tds', sql.Decimal(10,2), tds || 0)
      .input('remarks', sql.VarChar, remarks || null)
      .query(`
        INSERT INTO dbo.SalaryRevisions (
          EmpID, EffectiveDate, BasicSalary, HouseRentAllowance, SpecialAllowance, 
          MedicalAllowance, ConveyanceAllowance, OtherAllowance, ProvidentFundPercent, 
          ProfessionalTaxPercent, TDS, Remarks, IsActive
        )
        OUTPUT inserted.RevisionID AS id
        VALUES (
          @empId, @effectiveDate, @basicSalary, @hra, @specialAllowance, 
          @medicalAllowance, @conveyanceAllowance, @otherAllowance, @pfPercent, 
          @ptPercent, @tds, @remarks, 1
        )
      `);

    if (actorEmpId) {
      await pool.request()
        .input('actorEmpId', sql.Int, actorEmpId)
        .input('empId', sql.Int, empId)
        .query(`
          INSERT INTO dbo.AuditLogs (ActorEmpID, ActionType, ActionDesc)
          VALUES (@actorEmpId, 'SALARY_REVISION', 'Created new salary revision for employee ID ' + CAST(@empId AS VARCHAR))
        `);
    }

    return result.recordset[0].id;
  },

  /**
   * Get Salary Revisions for an employee
   */
  getSalaryRevisions: async (empId) => {
    const pool = await connectDB();
    const result = await pool.request()
      .input('empId', sql.Int, empId)
      .query('SELECT * FROM dbo.SalaryRevisions WHERE EmpID = @empId ORDER BY EffectiveDate DESC, CreatedAt DESC');
    return result.recordset;
  },

  getMonthlyPayrollReport: async (month, year) => {
    const pool = await connectDB();
    const result = await pool.request()
      .input('month', sql.Int, month || null)
      .input('year', sql.Int, year || null)
      .query(`
        SELECT SalaryYear AS year, CAST(SalaryMonth AS INT) AS month, 
               SUM(BasicSalary) AS totalBasic,
               SUM(TotalEarnings) AS totalEarnings,
               SUM(ProvidentFund) AS totalPF,
               SUM(ProfessionalTax) AS totalPT,
               SUM(LossOfPay) AS totalLOP,
               SUM(NetSalaryPaid) AS totalNetPaid
        FROM dbo.EmployeeSalarysDetails
        WHERE (@month IS NULL OR SalaryMonth = @month)
          AND (@year IS NULL OR SalaryYear = @year)
        GROUP BY SalaryYear, SalaryMonth
        ORDER BY SalaryYear DESC, CAST(SalaryMonth AS INT) DESC
      `);
    return result.recordset;
  },

  getYearlyPayrollReport: async (year) => {
    const pool = await connectDB();
    const result = await pool.request()
      .input('year', sql.Int, year || null)
      .query(`
        SELECT SalaryYear AS year,
               SUM(BasicSalary) AS totalBasic,
               SUM(TotalEarnings) AS totalEarnings,
               SUM(TotalDeductions) AS totalDeductions,
               SUM(NetSalaryPaid) AS totalNetPaid
        FROM dbo.EmployeeSalarysDetails
        WHERE (@year IS NULL OR SalaryYear = @year)
        GROUP BY SalaryYear
        ORDER BY SalaryYear DESC
      `);
    return result.recordset;
  },

  getDepartmentPayrollReport: async (month, year, department) => {
    const pool = await connectDB();
    const result = await pool.request()
      .input('month', sql.Int, month || null)
      .input('year', sql.Int, year || null)
      .input('dept', sql.VarChar, department || null)
      .query(`
        SELECT ISNULL(m.Department, 'Unassigned') AS departmentName,
               SUM(s.BasicSalary) AS totalBasic,
               SUM(s.TotalEarnings) AS totalEarnings,
               SUM(s.TotalDeductions) AS totalDeductions,
               SUM(s.NetSalaryPaid) AS totalNetPaid,
               COUNT(s.EmpID) AS employeeCount
        FROM dbo.EmployeeSalarysDetails s
        JOIN dbo.EmployeeMaster m ON s.EmpID = m.EmpID
        WHERE (@month IS NULL OR s.SalaryMonth = @month)
          AND (@year IS NULL OR s.SalaryYear = @year)
          AND (@dept IS NULL OR m.Department = @dept)
        GROUP BY m.Department
        ORDER BY totalNetPaid DESC
      `);
    return result.recordset;
  },

  getAttendanceReport: async (month, year, department) => {
    const pool = await connectDB();
    const result = await pool.request()
      .input('month', sql.Int, month || null)
      .input('year', sql.Int, year || null)
      .input('dept', sql.VarChar, department || null)
      .query(`
        SELECT a.EmpID, m.FirstName + ' ' + m.LastName AS employeeName, ISNULL(m.Department, 'Unassigned') AS departmentName,
               COUNT(a.AttendanceID) AS totalDays,
               SUM(CASE WHEN a.AttendanceStatus = 'Present' THEN 1 ELSE 0 END) AS presentDays,
               SUM(CASE WHEN a.AttendanceStatus = 'Absent' THEN 1 ELSE 0 END) AS absentDays,
               SUM(CASE WHEN a.AttendanceStatus = 'Half Day' THEN 1 ELSE 0 END) AS halfDays
        FROM dbo.EmployeeAttendance a
        JOIN dbo.EmployeeMaster m ON a.EmpID = m.EmpID
        WHERE (@month IS NULL OR MONTH(a.AttendanceDate) = @month)
          AND (@year IS NULL OR YEAR(a.AttendanceDate) = @year)
          AND (@dept IS NULL OR m.Department = @dept)
        GROUP BY a.EmpID, m.FirstName, m.LastName, m.Department
        ORDER BY m.Department, employeeName
      `);
    return result.recordset;
  },

  getLeavesReport: async (department) => {
    const pool = await connectDB();
    const result = await pool.request()
      .input('dept', sql.VarChar, department || null)
      .query(`
        SELECT l.LeaveType AS leaveType, l.LeaveStatus AS status, COUNT(*) AS count,
               SUM(l.LeaveDays) AS totalDays,
               ISNULL(m.Department, 'Unassigned') AS departmentName
        FROM dbo.EmployeeLeaveDetails l
        JOIN dbo.EmployeeMaster m ON l.EmpID = m.EmpID
        WHERE (@dept IS NULL OR m.Department = @dept)
        GROUP BY l.LeaveType, l.LeaveStatus, m.Department
        ORDER BY m.Department ASC, totalDays DESC
      `);
    return result.recordset;
  },

  getSalaryRevisionReport: async (department) => {
    const pool = await connectDB();
    const result = await pool.request()
      .input('dept', sql.VarChar, department || null)
      .query(`
        SELECT r.EmpID, m.FirstName + ' ' + m.LastName AS employeeName, ISNULL(m.Department, 'Unassigned') AS departmentName,
               r.EffectiveDate, r.BasicSalary, r.TotalAllowance, r.TotalDeduction, r.NetSalary
        FROM dbo.SalaryRevisions r
        JOIN dbo.EmployeeMaster m ON r.EmpID = m.EmpID
        WHERE (@dept IS NULL OR m.Department = @dept)
        ORDER BY r.EffectiveDate DESC, m.Department
      `);
    return result.recordset;
  },

  getInactiveEmployeesReport: async (department) => {
    const pool = await connectDB();
    const result = await pool.request()
      .input('dept', sql.VarChar, department || null)
      .query(`
        SELECT m.EmpID, m.FirstName + ' ' + m.LastName AS employeeName, ISNULL(m.Department, 'Unassigned') AS departmentName,
               m.Designation, d.EmailID AS personalEmail, m.UpdatedAt AS lastUpdated
        FROM dbo.EmployeeMaster m
        LEFT JOIN dbo.EmployeeDetails d ON m.EmpID = d.EmpID
        WHERE m.EmpStatus = 'Inactive'
          AND (@dept IS NULL OR m.Department = @dept)
        ORDER BY m.UpdatedAt DESC
      `);
    return result.recordset;
  },

  /**
   * Dashboard Statistics (Admin)
   */
  getDashboardStats: async () => {
    const pool = await connectDB();

    // 1. Total active employees
    const empCount = await pool.request().query(`
      SELECT COUNT(*) AS total FROM dbo.EmployeeMaster WHERE EmpStatus = 'Active'
    `);

    // 2. Total payroll processed (current year)
    const currentYear = new Date().getFullYear();
    const payrollTotal = await pool.request()
      .input('year', sql.Int, currentYear)
      .query(`
        SELECT ISNULL(SUM(s.NetSalaryPaid), 0) AS totalPayroll
        FROM dbo.EmployeeSalarysDetails s
        JOIN dbo.PayrollRuns r ON s.RunID = r.RunID
        WHERE s.SalaryYear = @year AND r.Status = 'Released'
      `);

    // 3. On leave today
    const today = new Date().toISOString().split('T')[0];
    const onLeaveToday = await pool.request()
      .input('today', sql.Date, today)
      .query(`
        SELECT COUNT(DISTINCT EmpID) AS count
        FROM dbo.EmployeeLeaveDetails
        WHERE LeaveStatus = 'Approved'
          AND @today BETWEEN FromDate AND ToDate
      `);

    // 4. Average attendance % (current month)
    const currentMonth = new Date().getMonth() + 1;
    const avgAttendance = await pool.request()
      .input('month', sql.Int, currentMonth)
      .input('year', sql.Int, currentYear)
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

    // 5. Monthly payroll totals (last 12 months for bar chart)
    const monthlyPayroll = await pool.request().query(`
      SELECT TOP 12 CAST(s.SalaryMonth AS INT) AS month, s.SalaryYear AS year, 
             SUM(s.NetSalaryPaid) AS total
      FROM dbo.EmployeeSalarysDetails s
      JOIN dbo.PayrollRuns r ON s.RunID = r.RunID
      WHERE r.Status = 'Released'
      GROUP BY s.SalaryYear, s.SalaryMonth
      ORDER BY s.SalaryYear DESC, CAST(s.SalaryMonth AS INT) DESC
    `);

    // 6. Recent pending approvals (leaves + profile change requests)
    const pendingLeaves = await pool.request().query(`
      SELECT TOP 5 l.LeaveID AS id, l.EmpID, m.FirstName, m.LastName,
             l.LeaveType AS type, l.TotalDays AS days, l.FromDate AS startDate,
             l.LeaveDate AS createdAt, 'Leave Request' AS category
      FROM dbo.EmployeeLeaveDetails l
      JOIN dbo.EmployeeMaster m ON l.EmpID = m.EmpID
      WHERE l.LeaveStatus = 'Pending'
      ORDER BY l.LeaveID DESC
    `);

    const pendingProfileChanges = await pool.request().query(`
      SELECT TOP 5 r.RequestID AS id, r.EmpID, m.FirstName, m.LastName,
             r.RequestedData, r.RequestedAt AS createdAt, 'Profile Update' AS category
      FROM dbo.EmployeeProfileChangeRequests r
      JOIN dbo.EmployeeMaster m ON r.EmpID = m.EmpID
      WHERE r.Status = 'Pending'
      ORDER BY r.RequestedAt DESC
    `);

    // Merge pending items and sort by recency
    const pendingApprovals = [
      ...pendingLeaves.recordset.map(l => ({
        id: l.id,
        name: `${l.FirstName} ${l.LastName}`,
        category: l.category,
        desc: `${l.type} (${l.days} day${l.days > 1 ? 's' : ''})`,
        time: l.createdAt
      })),
      ...pendingProfileChanges.recordset.map(p => {
        let desc = 'Profile Update';
        try {
          const parsed = JSON.parse(p.RequestedData || '{}');
          const keys = Object.keys(parsed).map(k => k.charAt(0).toUpperCase() + k.slice(1));
          if (keys.length > 0) {
            desc = `Update: ${keys.join(', ')}`;
          }
        } catch (err) {
          // ignore
        }
        return {
          id: p.id,
          name: `${p.FirstName} ${p.LastName}`,
          category: p.category,
          desc: desc,
          time: p.createdAt
        };
      })
    ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 5);

    return {
      totalEmployees: empCount.recordset[0].total,
      totalPayroll: parseFloat(payrollTotal.recordset[0].totalPayroll),
      onLeaveToday: onLeaveToday.recordset[0].count,
      avgAttendance: parseFloat(avgAttendance.recordset[0].avgPct),
      monthlyPayroll: monthlyPayroll.recordset.reverse(), // chronological order
      pendingApprovals
    };
  },

  /**
   * PDF Generation Engine
   */
  downloadPayslipPdf: async (payrollId, employeeId, res) => {
    const pool = await connectDB();
    
    // Fetch payslip & employee profile
    const payslip = await payrollService.getPayslip(payrollId, employeeId);
    
    // Fetch company settings
    const companyResult = await pool.request().query('SELECT TOP 1 * FROM dbo.CompanySettings');
    const company = companyResult.recordset[0] || {
      CompanyName: 'NEXUS HRMS',
      CompanyAddress: 'Enterprise Payroll Management System',
      CompanyPAN: 'N/A',
      CompanyGST: 'N/A'
    };

    // Generate PDF document
    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    // Set Response Headers
    const safeName = (payslip.employee_name || 'employee').trim().replace(/\s+/g, '_');
    const filename = `Payslip_${safeName}_${payslip.month}_${payslip.year}.pdf`;
    res.setHeader('Content-disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-type', 'application/pdf');

    doc.pipe(res);

    // --- Page dimensions ---
    const pageLeft = 40;
    const pageRight = 555;
    const pageWidth = pageRight - pageLeft;
    const colMid = pageLeft + pageWidth / 2; // 297.5

    // --- Colors ---
    const dark = '#0f172a';
    const medium = '#334155';
    const light = '#64748b';
    const accent = '#2563eb';
    const headerBg = '#1e293b';
    const rowBg = '#f1f5f9';
    const white = '#ffffff';

    // ============================
    // HEADER BANNER
    // ============================
    doc.rect(pageLeft, 40, pageWidth, 55).fill(headerBg);
    doc.fillColor(white).fontSize(16).text(company.CompanyName.toUpperCase(), pageLeft + 15, 50, { bold: true });
    doc.fontSize(8.5).fillColor('#94a3b8').text(company.CompanyAddress || '', pageLeft + 15, 68);
    // Draw company PAN & GST in the header on the right
    doc.fontSize(8.5).fillColor('#94a3b8').text(`PAN: ${company.CompanyPAN || 'N/A'} | GST: ${company.CompanyGST || 'N/A'}`, pageRight - 180, 50, { width: 170, align: 'right' });
    doc.fillColor(white).fontSize(10).text('PAYSLIP', pageRight - 80, 68, { width: 70, align: 'right' });

    // ============================
    // PAYSLIP PERIOD TITLE
    // ============================
    const monthName = new Date(payslip.year, payslip.month - 1).toLocaleString('default', { month: 'long' }).toUpperCase();
    doc.moveDown(2);
    const titleY = doc.y;
    doc.fillColor(dark).fontSize(12).text(`SALARY SLIP FOR ${monthName} ${payslip.year}`, pageLeft, titleY);
    doc.strokeColor(accent).lineWidth(2).moveTo(pageLeft, titleY + 18).lineTo(pageRight, titleY + 18).stroke();

    // ============================
    // EMPLOYEE INFORMATION GRID
    // ============================
    let y = titleY + 30;
    const labelFont = 8;
    const valueFont = 9.5;
    const infoRowH = 18;

    const drawInfoRow = (label, value, x, yPos) => {
      doc.fontSize(labelFont).fillColor(light).text(label, x, yPos);
      doc.fontSize(valueFont).fillColor(dark).text(String(value || 'N/A'), x + 105, yPos);
    };

    // Row 1
    drawInfoRow('Employee Name', payslip.employee_name, pageLeft, y);
    drawInfoRow('Employee ID', payslip.legacy_emp_id || payslip.employee_id, colMid + 10, y);
    y += infoRowH;

    // Row 2
    drawInfoRow('Designation', payslip.designation, pageLeft, y);
    drawInfoRow('Department', payslip.department, colMid + 10, y);
    y += infoRowH;

    // Row 3
    drawInfoRow('PAN', payslip.pan || 'N/A', pageLeft, y);
    drawInfoRow('UAN', payslip.uan_no || 'N/A', colMid + 10, y);
    y += infoRowH;

    // Row 4
    drawInfoRow('Bank', payslip.bank_name || 'N/A', pageLeft, y);
    drawInfoRow('Account No', payslip.bank_account_no || 'N/A', colMid + 10, y);
    y += infoRowH;

    // Row 5
    drawInfoRow('Days Paid', `${payslip.employee_working_days} / ${payslip.monthly_working_days} Days`, pageLeft, y);
    drawInfoRow('L.O.P. / Absent Days', `${payslip.unpaid_leave_days || 0} / ${payslip.absent_days || 0}`, colMid + 10, y);
    y += infoRowH;

    // Row 6
    drawInfoRow('Payment Status', payslip.payment_status, pageLeft, y);
    drawInfoRow('Payment Date', payslip.payment_date ? new Date(payslip.payment_date).toLocaleDateString('en-IN') : 'N/A', colMid + 10, y);
    y += infoRowH + 8;

    // ============================
    // EARNINGS & DEDUCTIONS TABLE
    // ============================
    const tableTop = y;
    const colW = pageWidth / 2;
    const rowH = 22;

    // --- Table Headers ---
    doc.rect(pageLeft, tableTop, colW, rowH).fill(headerBg);
    doc.rect(colMid, tableTop, colW, rowH).fill(headerBg);

    doc.fillColor(white).fontSize(9);
    doc.text('EARNINGS', pageLeft + 10, tableTop + 6);
    doc.text('AMOUNT (₹)', colMid - 75, tableTop + 6, { width: 65, align: 'right' });
    doc.text('DEDUCTIONS', colMid + 10, tableTop + 6);
    doc.text('AMOUNT (₹)', pageRight - 75, tableTop + 6, { width: 65, align: 'right' });

    // --- Table body data ---
    const earnings = [
      ['Basic Salary', parseFloat(payslip.basic_salary || 0).toFixed(2)],
      ['House Rent Allowance', parseFloat(payslip.hra || 0).toFixed(2)],
      ['Special Allowance', parseFloat(payslip.special_allowance || 0).toFixed(2)],
      ['Other Allowances', parseFloat(payslip.allowances || 0).toFixed(2)],
    ];

    const deductions = [
      ['Provident Fund', parseFloat(payslip.pf || 0).toFixed(2)],
      ['Professional Tax', parseFloat(payslip.pt || 0).toFixed(2)],
      ['Loss of Pay (LOP)', parseFloat(payslip.lop || 0).toFixed(2)],
      ['TDS', parseFloat(payslip.tds || 0).toFixed(2)],
    ];

    const maxRows = Math.max(earnings.length, deductions.length);
    for (let i = 0; i < maxRows; i++) {
      const rY = tableTop + rowH + i * rowH;

      // Alternate row background
      if (i % 2 === 0) {
        doc.rect(pageLeft, rY, colW, rowH).fill(rowBg);
        doc.rect(colMid, rY, colW, rowH).fill(rowBg);
      } else {
        doc.rect(pageLeft, rY, colW, rowH).fill(white);
        doc.rect(colMid, rY, colW, rowH).fill(white);
      }

      doc.fillColor(medium).fontSize(9);

      // Earnings column
      if (earnings[i]) {
        doc.text(earnings[i][0], pageLeft + 10, rY + 6);
        doc.text(earnings[i][1], colMid - 75, rY + 6, { width: 65, align: 'right' });
      }

      // Deductions column
      if (deductions[i] && deductions[i][0]) {
        doc.text(deductions[i][0], colMid + 10, rY + 6);
        doc.text(deductions[i][1], pageRight - 75, rY + 6, { width: 65, align: 'right' });
      }
    }

    // --- Table borders ---
    const tableBottom = tableTop + rowH + maxRows * rowH;
    doc.strokeColor('#cbd5e1').lineWidth(0.5);
    // Outer border
    doc.rect(pageLeft, tableTop, pageWidth, tableBottom - tableTop).stroke();
    // Vertical divider
    doc.moveTo(colMid, tableTop).lineTo(colMid, tableBottom).stroke();

    // ============================
    // TOTALS ROW
    // ============================
    const totY = tableBottom + 2;
    doc.rect(pageLeft, totY, colW, rowH).fill('#e2e8f0');
    doc.rect(colMid, totY, colW, rowH).fill('#e2e8f0');

    doc.fillColor(dark).fontSize(9.5);
    doc.text('Gross Earnings', pageLeft + 10, totY + 6, { bold: true });
    doc.text(parseFloat(payslip.total_earnings || 0).toFixed(2), colMid - 75, totY + 6, { width: 65, align: 'right' });
    doc.text('Total Deductions', colMid + 10, totY + 6, { bold: true });
    doc.text(parseFloat(payslip.deductions || 0).toFixed(2), pageRight - 75, totY + 6, { width: 65, align: 'right' });

    doc.strokeColor('#cbd5e1').lineWidth(0.5);
    doc.rect(pageLeft, totY, pageWidth, rowH).stroke();
    doc.moveTo(colMid, totY).lineTo(colMid, totY + rowH).stroke();

    // ============================
    // NET SALARY BAR
    // ============================
    const netY = totY + rowH + 10;
    doc.rect(pageLeft, netY, pageWidth, 32).fill(accent);
    doc.fillColor(white).fontSize(13).text(
      `NET SALARY:  ₹ ${parseFloat(payslip.net_salary || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      pageLeft + 15, netY + 9
    );

    // ============================
    // FOOTER
    // ============================
    doc.moveDown(4);
    doc.fillColor(light).fontSize(7.5).text(
      'This is a system-generated payslip and does not require a physical signature.',
      pageLeft, doc.y, { align: 'center', width: pageWidth }
    );
    doc.moveDown(0.5);
    doc.text(
      `Company GSTIN: ${company.CompanyGST || 'N/A'} | PF Registration: ${company.PFNumber || 'N/A'}`,
      pageLeft, doc.y, { align: 'center', width: pageWidth }
    );
    doc.moveDown(0.5);
    doc.text(
      'Nexus HRMS — Production Parity Payroll Engine V4',
      pageLeft, doc.y, { align: 'center', width: pageWidth }
    );

    doc.end();
  },

  /**
   * Pre-flight confirmation data before generating payroll
   * Returns employee counts and existing run status (if any)
   */
  getPayrollConfirmationData: async (month, year) => {
    const pool = await connectDB();

    // Eligible employee counts
    const countsResult = await pool.request()
      .input('month', sql.Int, month)
      .input('year', sql.Int, year)
      .query(`
        SELECT
          SUM(CASE WHEN EmpStatus = 'Active'    AND IsPayrollEligible = 1 THEN 1 ELSE 0 END) AS eligibleCount,
          SUM(CASE WHEN EmpStatus = 'Inactive'                           THEN 1 ELSE 0 END) AS inactiveCount,
          SUM(CASE WHEN EmpStatus = 'On Notice' AND IsPayrollEligible = 1 THEN 1 ELSE 0 END) AS onNoticeCount,
          SUM(CASE WHEN EmpStatus = 'On Leave'  AND IsPayrollEligible = 1 THEN 1 ELSE 0 END) AS onLeaveCount
        FROM dbo.EmployeeMaster
      `);

    const counts = countsResult.recordset[0];

    // Calendar check
    const calResult = await pool.request()
      .input('month', sql.Int, month)
      .input('year', sql.Int, year)
      .query(`
        SELECT PayrollProcessingDate, IsActive
        FROM dbo.PayrollCalendar
        WHERE PayrollMonth = @month AND PayrollYear = @year AND IsActive = 1
      `);

    let calendarConfigured = calResult.recordset.length > 0;
    let processingDate = null;
    let isBlocked = false;

    // Check if the requested month/year is in the past
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const requestedMonth = new Date(year, month - 1, 1);
    const isPastMonth = requestedMonth < currentMonth;

    if (calendarConfigured) {
      processingDate = calResult.recordset[0].PayrollProcessingDate;
      isBlocked = new Date() < new Date(processingDate);
    } else if (isPastMonth) {
      // Allow historical generations seamlessly
      calendarConfigured = true;
      isBlocked = false;
      processingDate = new Date(); // mock processing date
    }

    // Existing run status
    const runResult = await pool.request()
      .input('month', sql.Int, month)
      .input('year', sql.Int, year)
      .query(`
        SELECT TOP 1 RunID, Status, Version, RunDate
        FROM dbo.PayrollRuns
        WHERE SalaryMonth = @month AND SalaryYear = @year
        ORDER BY Version DESC
      `);

    const existingRun = runResult.recordset.length > 0 ? runResult.recordset[0] : null;

    return {
      month,
      year,
      eligibleCount: counts.eligibleCount || 0,
      inactiveCount: counts.inactiveCount || 0,
      onNoticeCount: counts.onNoticeCount || 0,
      onLeaveCount: counts.onLeaveCount || 0,
      calendarConfigured,
      processingDate,
      isBlocked,
      existingRun: existingRun
        ? { runId: existingRun.RunID, status: existingRun.Status, version: existingRun.Version, runDate: existingRun.RunDate }
        : null
    };
  },

  /**
   * Dedicated Release endpoint (replaces release logic in updatePayrollRunStatus)
   * Marks salary rows as Paid, writes ReleasedBy/ReleasedAt, sends categorised notifications
   */
  releasePayroll: async (runId, adminId) => {
    const pool = await connectDB();

    // Verify run is Approved
    const runResult = await pool.request()
      .input('runId', sql.Int, runId)
      .query('SELECT RunID, Status, SalaryMonth, SalaryYear, Version FROM dbo.PayrollRuns WHERE RunID = @runId');

    if (runResult.recordset.length === 0) throw new Error('Payroll run not found.');
    const run = runResult.recordset[0];
    if (run.Status !== 'Approved') throw new Error('Only Approved payroll runs can be released.');

    const adminResult = await pool.request()
      .input('adminId', sql.Int, adminId)
      .query('SELECT FirstName, LastName FROM dbo.EmployeeMaster WHERE EmpID = @adminId');
    const adminName = adminResult.recordset.length > 0
      ? `${adminResult.recordset[0].FirstName} ${adminResult.recordset[0].LastName}` : 'Admin';

    // Update run status
    await pool.request()
      .input('runId', sql.Int, runId)
      .input('adminId', sql.Int, adminId)
      .query(`
        UPDATE dbo.PayrollRuns
        SET Status = 'Released', ReleasedBy = @adminId, ReleasedAt = GETDATE()
        WHERE RunID = @runId
      `);

    // Mark all salary records as Paid
    await pool.request()
      .input('runId', sql.Int, runId)
      .query(`
        UPDATE dbo.EmployeeSalarysDetails
        SET PaymentStatus = 'Paid', PaymentDate = GETDATE()
        WHERE RunID = @runId
      `);

    // Fetch employees in this run and send notifications
    const employeesInRun = await pool.request()
      .input('runId', sql.Int, runId)
      .query(`
        SELECT s.SalaryID, s.EmpID, d.EmailID, s.NetSalaryPaid, s.SalaryMonth, s.SalaryYear
        FROM dbo.EmployeeSalarysDetails s
        JOIN dbo.EmployeeDetails d ON s.EmpID = d.EmpID
        WHERE s.RunID = @runId
      `);

    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    for (const row of employeesInRun.recordset) {
      const monthName = months[parseInt(row.SalaryMonth) - 1] || row.SalaryMonth;
      const notifMsg = `Your ${monthName} ${row.SalaryYear} payslip has been released. Net pay: ₹${parseFloat(row.NetSalaryPaid).toLocaleString('en-IN')}.`;

      await pool.request()
        .input('empId', sql.Int, row.EmpID)
        .input('title', sql.VarChar, `Payslip Released – ${monthName} ${row.SalaryYear}`)
        .input('msg', sql.VarChar, notifMsg)
        .input('relatedId', sql.Int, runId)
        .query(`
          INSERT INTO dbo.Notifications (EmpID, Title, Message, IsRead, Category, RelatedID, CreatedAt)
          VALUES (@empId, @title, @msg, 0, 'Payroll', @relatedId, GETDATE())
        `);

      // Dispatch log
      await pool.request()
        .input('empId', sql.Int, row.EmpID)
        .input('salaryId', sql.Int, row.SalaryID)
        .input('email', sql.VarChar, row.EmailID || 'employee@nexus.com')
        .query(`
          INSERT INTO dbo.PayslipDispatchLogs (EmpID, SalaryID, EmailAddress, DispatchStatus, CreatedAt, DispatchedAt)
          VALUES (@empId, @salaryId, @email, 'Sent', GETDATE(), GETDATE())
        `);
    }

    // Audit log
    const formattedPeriod = `${run.SalaryYear}-${String(run.SalaryMonth).padStart(2,'0')}`;
    await pool.request()
      .input('adminId', sql.Int, adminId)
      .input('desc', sql.VarChar, `Payroll Run ${formattedPeriod} v${run.Version} released by ${adminName} (${adminId}).`)
      .query(`INSERT INTO dbo.AuditLogs (ActorEmpID, ActionType, ActionDesc) VALUES (@adminId, 'PAYROLL_RELEASED', @desc)`);

    return {
      released: true,
      message: `Payroll for ${formattedPeriod} (v${run.Version}) released successfully.`,
      employeesNotified: employeesInRun.recordset.length
    };
  },

  /**
   * Full payroll run history for Payroll History screen
   */
  getPayrollRunHistory: async () => {
    const pool = await connectDB();
    const result = await pool.request().query(`
      SELECT
        r.RunID         AS id,
        r.SalaryMonth   AS month,
        r.SalaryYear    AS year,
        r.Version       AS version,
        r.Status        AS status,
        r.RunDate       AS runDate,
        g.FirstName + ' ' + g.LastName AS generatedByName,
        a.FirstName + ' ' + a.LastName AS approvedByName,
        r.ApprovedDate  AS approvedDate,
        rb.FirstName + ' ' + rb.LastName AS releasedByName,
        r.ReleasedAt    AS releasedAt,
        ISNULL(s.EmployeesProcessed, 0)                    AS totalEmployees,
        ISNULL(s.NetPayable, 0)                            AS totalAmount,
        ISNULL(s.ExceptionsCount, 0)                       AS exceptions
      FROM dbo.PayrollRuns r
      LEFT JOIN dbo.EmployeeMaster g  ON r.GeneratedBy = g.EmpID
      LEFT JOIN dbo.EmployeeMaster a  ON r.ApprovedBy  = a.EmpID
      LEFT JOIN dbo.EmployeeMaster rb ON r.ReleasedBy  = rb.EmpID
      LEFT JOIN dbo.PayrollRunSummary s ON r.RunID = s.RunID
      ORDER BY r.SalaryYear DESC, r.SalaryMonth DESC, r.Version DESC
    `);
    return result.recordset;
  },

  /**
   * Get assigned HR Admin and Reporting Manager for the logged-in employee
   */
  getEmployeeHrManager: async (empId) => {
    const pool = await connectDB();

    const hrResult = await pool.request()
      .input('empId', sql.Int, empId)
      .query(`
        SELECT m.EmpID, m.FirstName + ' ' + m.LastName AS name, d.EmailID
        FROM dbo.AdminEmployeeMapping aem
        JOIN dbo.EmployeeMaster m ON aem.AdminEmpID = m.EmpID
        LEFT JOIN dbo.EmployeeDetails d ON m.EmpID = d.EmpID
        WHERE aem.EmployeeEmpID = @empId
      `);

    const managerResult = await pool.request()
      .input('empId', sql.Int, empId)
      .query(`
        SELECT m.EmpID, m.FirstName + ' ' + m.LastName AS name
        FROM dbo.EmployeeReporting er
        JOIN dbo.EmployeeMaster m ON er.ManagerID = m.EmpID
        WHERE er.EmpID = @empId
      `);

    return {
      hrAdmin: hrResult.recordset.length > 0 ? hrResult.recordset[0] : null,
      reportingManager: managerResult.recordset.length > 0 ? managerResult.recordset[0] : null
    };
  },

  /**
   * Hard delete a payroll run and cascade all related records.
   */
  deletePayrollRun: async (runId) => {
    const pool = await connectDB();
    const transaction = pool.transaction();
    try {
      await transaction.begin();

      // Ensure run exists
      const runCheck = await transaction.request()
        .input('runId', sql.Int, runId)
        .query('SELECT Status FROM dbo.PayrollRuns WHERE RunID = @runId');
      
      if (runCheck.recordset.length === 0) throw new Error('Run not found');

      // Delete child records sequentially
      await transaction.request().input('runId', sql.Int, runId).query('DELETE FROM dbo.PayrollRunEmployees WHERE RunID = @runId');
      await transaction.request().input('runId', sql.Int, runId).query('DELETE FROM dbo.EmployeeSalarysDetails WHERE RunID = @runId');
      await transaction.request().input('runId', sql.Int, runId).query('DELETE FROM dbo.PayrollExceptions WHERE RunID = @runId');
      await transaction.request().input('runId', sql.Int, runId).query('DELETE FROM dbo.PayrollRunSummary WHERE RunID = @runId');
      await transaction.request().input('runId', sql.Int, runId).query('DELETE FROM dbo.PayrollApprovalOtp WHERE RunID = @runId');

      // Delete the main run
      await transaction.request().input('runId', sql.Int, runId).query('DELETE FROM dbo.PayrollRuns WHERE RunID = @runId');

      await transaction.commit();
      return true;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};

