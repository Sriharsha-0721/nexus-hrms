import { connectDB, sql } from '../config/db.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const importService = {
  // 1. MASTER CSV IMPORT (Reuse & Enhance Employee Master merging)
  importMaster: async (rows, actorId) => {
    const pool = await connectDB();
    const sessionId = crypto.randomUUID();
    
    // Insert into Staging_Employees first
    for (const row of rows) {
      const legacyEmpId = row.legacy_emp_id || row.uppid || '';
      const email = row.email || '';
      const firstName = row.first_name || '';
      const lastName = row.last_name || '';
      const designation = row.designation || '';
      const department = row.department || '';
      const joinDate = row.join_date || row.doj || '';
      const phone = row.phone || '';
      const role = row.role || 'employee';

      await pool.request()
        .input('importSessionId', sql.UniqueIdentifier, sessionId)
        .input('legacyEmpId', sql.VarChar, legacyEmpId.trim() || null)
        .input('email', sql.VarChar, email.trim() || null)
        .input('firstName', sql.VarChar, firstName.trim() || null)
        .input('lastName', sql.VarChar, lastName.trim() || null)
        .input('designation', sql.VarChar, designation.trim() || null)
        .input('department', sql.VarChar, department.trim() || null)
        .input('joinDate', sql.VarChar, joinDate.trim() || null)
        .input('phone', sql.VarChar, phone.trim() || null)
        .input('role', sql.VarChar, role.trim() || null)
        .query(`
          INSERT INTO dbo.Staging_Employees 
          (import_session_id, raw_legacy_emp_id, raw_email, raw_first_name, raw_last_name, raw_designation, raw_department, raw_join_date, raw_phone, raw_role, validation_status)
          VALUES 
          (@importSessionId, @legacyEmpId, @email, @firstName, @lastName, @designation, @department, @joinDate, @phone, @role, 'Pending')
        `);
    }

    // Run validation in staging
    const stagedRowsResult = await pool.request()
      .input('importSessionId', sql.UniqueIdentifier, sessionId)
      .query(`SELECT * FROM dbo.Staging_Employees WHERE import_session_id = @importSessionId AND validation_status = 'Pending'`);
    const stagedRows = stagedRowsResult.recordset;

    const existingEmployees = (await pool.request().query(`
      SELECT m.EmpID, d.EmailID, d.UPPID FROM dbo.EmployeeMaster m LEFT JOIN dbo.EmployeeDetails d ON m.EmpID = d.EmpID
    `)).recordset;

    let successCount = 0;
    let failedCount = 0;
    const errorsList = [];

    const VALID_ROLES = ['SuperAdmin', 'HRAdmin', 'PayrollAdmin', 'employee'];

    for (const stagedRow of stagedRows) {
      let isValid = true;
      const errors = [];
      const legacyId = stagedRow.raw_legacy_emp_id;
      const email = stagedRow.raw_email;
      const firstName = stagedRow.raw_first_name;
      const lastName = stagedRow.raw_last_name;
      const roleName = stagedRow.raw_role || 'employee';

      if (!legacyId) {
        isValid = false;
        errors.push('LegacyEmpId (UPPID) is missing.');
      }
      if (!firstName || !lastName) {
        isValid = false;
        errors.push('First and Last name are required.');
      }
      if (email && !EMAIL_REGEX.test(email)) {
        isValid = false;
        errors.push(`Invalid email format: ${email}`);
      }

      let parsedDate = new Date();
      if (stagedRow.raw_join_date) {
        parsedDate = new Date(stagedRow.raw_join_date);
        if (isNaN(parsedDate.getTime())) {
          isValid = false;
          errors.push(`Invalid join date: ${stagedRow.raw_join_date}`);
        }
      }

      const status = isValid ? 'Valid' : 'Invalid';
      const errorMsg = errors.join(' | ');

      await pool.request()
        .input('stagingId', sql.Int, stagedRow.staging_id)
        .input('status', sql.VarChar, status)
        .input('error', sql.VarChar, errorMsg || null)
        .query('UPDATE dbo.Staging_Employees SET validation_status = @status, validation_error = @error WHERE staging_id = @stagingId');

      if (!isValid) {
        failedCount++;
        errorsList.push({ row: legacyId || `${firstName} ${lastName}`, error: errorMsg });
      }
    }

    // Merge valid rows
    const validRowsResult = await pool.request()
      .input('importSessionId', sql.UniqueIdentifier, sessionId)
      .query(`SELECT * FROM dbo.Staging_Employees WHERE import_session_id = @importSessionId AND validation_status = 'Valid'`);
    const validRows = validRowsResult.recordset;

    for (const validRow of validRows) {
      const legacyId = validRow.raw_legacy_emp_id;
      const email = validRow.raw_email || `${validRow.raw_first_name.toLowerCase()}.${validRow.raw_last_name.toLowerCase()}@nexus.com`;
      const firstName = validRow.raw_first_name;
      const lastName = validRow.raw_last_name;
      const role = validRow.raw_role || 'employee';
      const designation = validRow.raw_designation || '';
      const department = validRow.raw_department || '';
      const joinDate = validRow.raw_join_date ? new Date(validRow.raw_join_date) : new Date();
      const phone = validRow.raw_phone || null;
      const fullName = `${firstName} ${lastName}`.trim();

      const prodRecord = existingEmployees.find(e => e.UPPID === legacyId);

      const transaction = new sql.Transaction(pool);
      await transaction.begin();
      try {
        if (prodRecord) {
          const empId = prodRecord.EmpID;
          // Update
          await transaction.request()
            .input('empId', sql.Int, empId)
            .input('firstName', sql.VarChar, firstName)
            .input('lastName', sql.VarChar, lastName)
            .input('designation', sql.VarChar, designation)
            .input('department', sql.VarChar, department)
            .input('joinDate', sql.Date, joinDate)
            .query(`
              UPDATE dbo.EmployeeMaster
              SET FirstName = @firstName, LastName = @lastName, Designation = @designation, Department = @department, DOJ = @joinDate
              WHERE EmpID = @empId
            `);

          await transaction.request()
            .input('empId', sql.Int, empId)
            .input('email', sql.VarChar, email)
            .input('fullName', sql.VarChar, fullName)
            .input('phone', sql.VarChar, phone)
            .query(`
              UPDATE dbo.EmployeeDetails
              SET EmailID = @email, FullName = @fullName, Phone = @phone
              WHERE EmpID = @empId
            `);

          // Update username in logins if changed
          await transaction.request()
            .input('empId', sql.Int, empId)
            .input('username', sql.VarChar, email)
            .query(`
              UPDATE dbo.EmployeeLogins SET Username = @username WHERE EmpID = @empId;
              UPDATE dbo.AdminLogins SET Username = @username WHERE EmpID = @empId;
            `);

          successCount++;
        } else {
          // Insert
          const masterResult = await transaction.request()
            .input('firstName', sql.VarChar, firstName)
            .input('lastName', sql.VarChar, lastName)
            .input('joinDate', sql.Date, joinDate)
            .input('designation', sql.VarChar, designation)
            .input('department', sql.VarChar, department)
            .query(`
              INSERT INTO dbo.EmployeeMaster (FirstName, LastName, DOJ, Designation, Department, EmpStatus)
              OUTPUT inserted.EmpID
              VALUES (@firstName, @lastName, @joinDate, @designation, @department, 'Active')
            `);
          const empId = masterResult.recordset[0].EmpID;

          await transaction.request()
            .input('empId', sql.Int, empId)
            .input('fullName', sql.VarChar, fullName)
            .input('email', sql.VarChar, email)
            .input('phone', sql.VarChar, phone)
            .input('legacyId', sql.VarChar, legacyId)
            .query(`
              INSERT INTO dbo.EmployeeDetails (EmpID, FullName, EmailID, Phone, UPPID, EmploymentType)
              VALUES (@empId, @fullName, @email, @phone, @legacyId, 'Full-time')
            `);

          const tempPassword = 'Temp@123';
          const salt = bcrypt.genSaltSync(10);
          const passwordHash = bcrypt.hashSync(tempPassword, salt);

          if (['SuperAdmin', 'HRAdmin', 'PayrollAdmin'].includes(role)) {
            await transaction.request()
              .input('empId', sql.Int, empId)
              .input('username', sql.VarChar, email)
              .input('password', sql.VarChar, passwordHash)
              .input('role', sql.VarChar, role)
              .query(`
                INSERT INTO dbo.AdminLogins (EmpID, Username, Password, Role, UserStatus)
                VALUES (@empId, @username, @password, @role, 'Active')
              `);
          } else {
            await transaction.request()
              .input('empId', sql.Int, empId)
              .input('username', sql.VarChar, email)
              .input('password', sql.VarChar, passwordHash)
              .query(`
                INSERT INTO dbo.EmployeeLogins (EmpID, Username, Password, UserStatus)
                VALUES (@empId, @username, @password, 'Active')
              `);
          }

          // Default salary structure
          await transaction.request()
            .input('empId', sql.Int, empId)
            .input('effectiveDate', sql.Date, joinDate)
            .query(`
              INSERT INTO dbo.SalaryRevisions (
                EmpID, EffectiveDate, BasicSalary, HouseRentAllowance, SpecialAllowance,
                MedicalAllowance, ConveyanceAllowance, OtherAllowance,
                ProvidentFundPercent, ProfessionalTaxPercent, TDS, Remarks, IsActive
              )
              VALUES (
                @empId, @effectiveDate, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00,
                12.00, 0.40, 0.00, 'Imported initial salary structure', 1
              )
            `);

          successCount++;
        }

        await transaction.request()
          .input('stagingId', sql.Int, validRow.staging_id)
          .query(`UPDATE dbo.Staging_Employees SET validation_status = 'Imported', imported_at = GETDATE() WHERE staging_id = @stagingId`);

        await transaction.commit();
      } catch (err) {
        await transaction.rollback();
        failedCount++;
        errorsList.push({ row: legacyId, error: `Merge Error: ${err.message}` });
        
        await pool.request()
          .input('stagingId', sql.Int, validRow.staging_id)
          .input('error', sql.VarChar, err.message)
          .query(`UPDATE dbo.Staging_Employees SET validation_status = 'Invalid', validation_error = @error WHERE staging_id = @stagingId`);
      }
    }

    // Log to ImportAuditLogs
    const status = failedCount === 0 ? 'Success' : (successCount === 0 ? 'Failed' : 'Partial');
    await pool.request()
      .input('fileType', sql.VarChar, 'Master')
      .input('uploadedBy', sql.Int, actorId)
      .input('totalRows', sql.Int, rows.length)
      .input('successRows', sql.Int, successCount)
      .input('failedRows', sql.Int, failedCount)
      .input('status', sql.VarChar, status)
      .query(`
        INSERT INTO dbo.ImportAuditLogs (FileType, UploadedBy, UploadedDate, TotalRows, SuccessRows, FailedRows, Status)
        VALUES (@fileType, @uploadedBy, GETDATE(), @totalRows, @successRows, @failedRows, @status)
      `);

    return { totalProcessed: rows.length, successCount, failedCount, errors: errorsList };
  },

  // 2. DETAILS CSV IMPORT
  importDetails: async (rows, actorId) => {
    const pool = await connectDB();
    const existingEmployees = (await pool.request().query(`
      SELECT m.EmpID, d.UPPID FROM dbo.EmployeeMaster m LEFT JOIN dbo.EmployeeDetails d ON m.EmpID = d.EmpID
    `)).recordset;

    let successCount = 0;
    let failedCount = 0;
    const errorsList = [];

    for (const row of rows) {
      const legacyId = row.legacy_emp_id || row.uppid || '';
      if (!legacyId) {
        failedCount++;
        errorsList.push({ row: 'Unknown', error: 'Missing UPPID (legacy_emp_id)' });
        continue;
      }

      const prodRecord = existingEmployees.find(e => e.UPPID === legacyId);
      if (!prodRecord) {
        failedCount++;
        errorsList.push({ row: legacyId, error: `No active employee matches UPPID: ${legacyId}` });
        continue;
      }

      const empId = prodRecord.EmpID;
      const phone = row.phone || null;
      const address = row.address || null;
      const dob = row.dob ? new Date(row.dob) : null;
      const gender = row.gender || null;
      const bankName = row.bank_name || null;
      const bankAccountNo = row.bank_account_no || null;
      const ifscCode = row.ifsc_code || null;
      const maritalStatus = row.marital_status || null;
      const nationality = row.nationality || null;
      const aadharNo = row.aadhar_no || null;
      const panNo = row.pan_no || null;
      const uanNo = row.uan_no || null;
      const emergencyContactName = row.emergency_contact_name || null;
      const emergencyContactPhone = row.emergency_contact_phone || null;

      const transaction = new sql.Transaction(pool);
      await transaction.begin();
      try {
        await transaction.request()
          .input('empId', sql.Int, empId)
          .input('phone', sql.VarChar, phone)
          .input('address', sql.VarChar, address)
          .input('dob', sql.Date, dob)
          .input('gender', sql.VarChar, gender)
          .input('bankName', sql.VarChar, bankName)
          .input('bankAccountNo', sql.VarChar, bankAccountNo)
          .input('ifscCode', sql.VarChar, ifscCode)
          .input('maritalStatus', sql.VarChar, maritalStatus)
          .input('nationality', sql.VarChar, nationality)
          .input('aadharNo', sql.VarChar, aadharNo)
          .input('panNo', sql.VarChar, panNo)
          .input('uanNo', sql.VarChar, uanNo)
          .input('emergencyContactName', sql.VarChar, emergencyContactName)
          .input('emergencyContactPhone', sql.VarChar, emergencyContactPhone)
          .query(`
            UPDATE dbo.EmployeeDetails
            SET Phone = COALESCE(@phone, Phone),
                Address = COALESCE(@address, Address),
                DOB = COALESCE(@dob, DOB),
                Gender = COALESCE(@gender, Gender),
                BankName = COALESCE(@bankName, BankName),
                BankAccountNo = COALESCE(@bankAccountNo, BankAccountNo),
                IFSCCode = COALESCE(@ifscCode, IFSCCode),
                MaritalStatus = COALESCE(@maritalStatus, MaritalStatus),
                Nationality = COALESCE(@nationality, Nationality),
                AadharNo = COALESCE(@aadharNo, AadharNo),
                PANNo = COALESCE(@panNo, PANNo),
                UANNo = COALESCE(@uanNo, UANNo),
                EmergencyContactName = COALESCE(@emergencyContactName, EmergencyContactName),
                EmergencyContactPhone = COALESCE(@emergencyContactPhone, EmergencyContactPhone)
            WHERE EmpID = @empId
          `);

        // Audit Log
        await transaction.request()
          .input('actorId', sql.Int, actorId)
          .input('empId', sql.Int, empId)
          .query(`
            INSERT INTO dbo.AuditLogs (ActorEmpID, ActionType, ActionDesc)
            VALUES (@actorId, 'EMPLOYEE_UPDATE', 'Imported profile details for Employee ID ' + CAST(@empId AS VARCHAR))
          `);

        await transaction.commit();
        successCount++;
      } catch (err) {
        await transaction.rollback();
        failedCount++;
        errorsList.push({ row: legacyId, error: err.message });
      }
    }

    const status = failedCount === 0 ? 'Success' : (successCount === 0 ? 'Failed' : 'Partial');
    await pool.request()
      .input('fileType', sql.VarChar, 'Details')
      .input('uploadedBy', sql.Int, actorId)
      .input('totalRows', sql.Int, rows.length)
      .input('successRows', sql.Int, successCount)
      .input('failedRows', sql.Int, failedCount)
      .input('status', sql.VarChar, status)
      .query(`
        INSERT INTO dbo.ImportAuditLogs (FileType, UploadedBy, UploadedDate, TotalRows, SuccessRows, FailedRows, Status)
        VALUES (@fileType, @uploadedBy, GETDATE(), @totalRows, @successRows, @failedRows, @status)
      `);

    return { totalProcessed: rows.length, successCount, failedCount, errors: errorsList };
  },

  // 3. ATTENDANCE CSV IMPORT
  importAttendance: async (rows, actorId) => {
    const pool = await connectDB();
    const existingEmployees = (await pool.request().query(`
      SELECT m.EmpID, d.UPPID FROM dbo.EmployeeMaster m LEFT JOIN dbo.EmployeeDetails d ON m.EmpID = d.EmpID
    `)).recordset;

    let successCount = 0;
    let failedCount = 0;
    const errorsList = [];

    for (const row of rows) {
      const legacyId = row.legacy_emp_id || row.uppid || '';
      const dateStr = row.date || row.attendance_date || '';
      const status = row.status || row.attendance_status || 'Present';

      if (!legacyId || !dateStr) {
        failedCount++;
        errorsList.push({ row: legacyId || 'Unknown', error: 'Missing UPPID or Date' });
        continue;
      }

      const prodRecord = existingEmployees.find(e => e.UPPID === legacyId);
      if (!prodRecord) {
        failedCount++;
        errorsList.push({ row: legacyId, error: `No active employee matches UPPID: ${legacyId}` });
        continue;
      }

      const empId = prodRecord.EmpID;
      const attendanceDate = new Date(dateStr);
      if (isNaN(attendanceDate.getTime())) {
        failedCount++;
        errorsList.push({ row: legacyId, error: `Invalid date format: ${dateStr}` });
        continue;
      }

      // Check valid attendance status
      const validStatuses = ['Present', 'Absent', 'Late', 'Half Day', 'On Leave'];
      if (!validStatuses.includes(status)) {
        failedCount++;
        errorsList.push({ row: legacyId, error: `Invalid attendance status: ${status}` });
        continue;
      }

      const clockIn = row.clock_in || row.check_in || null;
      const clockOut = row.clock_out || row.check_out || null;
      let totalHours = row.total_hours ? parseFloat(row.total_hours) : null;
      let checkOutTimeDecimal = null;

      if (clockIn && clockOut && !totalHours) {
        const [inH, inM] = clockIn.split(':').map(Number);
        const [outH, outM] = clockOut.split(':').map(Number);
        totalHours = Math.max(0, (outH * 3600 + outM * 60 - (inH * 3600 + inM * 60)) / 3600);
        checkOutTimeDecimal = parseFloat((outH + outM / 60).toFixed(2));
      } else if (clockOut) {
        const [outH, outM] = clockOut.split(':').map(Number);
        checkOutTimeDecimal = parseFloat((outH + outM / 60).toFixed(2));
      }

      const transaction = new sql.Transaction(pool);
      await transaction.begin();
      try {
        // Check if record exists
        const checkResult = await transaction.request()
          .input('empId', sql.Int, empId)
          .input('attendanceDate', sql.Date, attendanceDate)
          .query('SELECT AttendanceID FROM dbo.EmployeeAttendance WHERE EmpID = @empId AND AttendanceDate = @attendanceDate');

        if (checkResult.recordset.length > 0) {
          // Update
          const attId = checkResult.recordset[0].AttendanceID;
          await transaction.request()
            .input('attId', sql.Int, attId)
            .input('status', sql.VarChar, status)
            .input('clockIn', sql.VarChar, clockIn ? `${clockIn}:00` : null)
            .input('clockOut', sql.VarChar, clockOut ? `${clockOut}:00` : null)
            .input('totalHours', sql.Decimal(5, 2), totalHours)
            .input('checkOutTimeDecimal', sql.Decimal(5, 2), checkOutTimeDecimal)
            .query(`
              UPDATE dbo.EmployeeAttendance
              SET AttendanceStatus = @status,
                  ClockIn = COALESCE(CAST(@clockIn AS TIME), ClockIn),
                  ClockOut = COALESCE(CAST(@clockOut AS TIME), ClockOut),
                  TotalHours = COALESCE(@totalHours, TotalHours),
                  CheckOutTime = COALESCE(@checkOutTimeDecimal, CheckOutTime)
              WHERE AttendanceID = @attId
            `);
        } else {
          // Insert
          await transaction.request()
            .input('empId', sql.Int, empId)
            .input('attendanceDate', sql.Date, attendanceDate)
            .input('status', sql.VarChar, status)
            .input('clockIn', sql.VarChar, clockIn ? `${clockIn}:00` : null)
            .input('clockOut', sql.VarChar, clockOut ? `${clockOut}:00` : null)
            .input('totalHours', sql.Decimal(5, 2), totalHours)
            .input('checkOutTimeDecimal', sql.Decimal(5, 2), checkOutTimeDecimal)
            .query(`
              INSERT INTO dbo.EmployeeAttendance (EmpID, AttendanceDate, AttendanceStatus, ClockIn, ClockOut, TotalHours, CheckOutTime)
              VALUES (@empId, @attendanceDate, @status, CAST(@clockIn AS TIME), CAST(@clockOut AS TIME), @totalHours, @checkOutTimeDecimal)
            `);
        }

        await transaction.commit();
        successCount++;
      } catch (err) {
        await transaction.rollback();
        failedCount++;
        errorsList.push({ row: legacyId, error: err.message });
      }
    }

    const status = failedCount === 0 ? 'Success' : (successCount === 0 ? 'Failed' : 'Partial');
    await pool.request()
      .input('fileType', sql.VarChar, 'Attendance')
      .input('uploadedBy', sql.Int, actorId)
      .input('totalRows', sql.Int, rows.length)
      .input('successRows', sql.Int, successCount)
      .input('failedRows', sql.Int, failedCount)
      .input('status', sql.VarChar, status)
      .query(`
        INSERT INTO dbo.ImportAuditLogs (FileType, UploadedBy, UploadedDate, TotalRows, SuccessRows, FailedRows, Status)
        VALUES (@fileType, @uploadedBy, GETDATE(), @totalRows, @successRows, @failedRows, @status)
      `);

    return { totalProcessed: rows.length, successCount, failedCount, errors: errorsList };
  },

  // 4. LEAVES CSV IMPORT
  importLeaves: async (rows, actorId) => {
    const pool = await connectDB();
    const existingEmployees = (await pool.request().query(`
      SELECT m.EmpID, d.UPPID FROM dbo.EmployeeMaster m LEFT JOIN dbo.EmployeeDetails d ON m.EmpID = d.EmpID
    `)).recordset;

    let successCount = 0;
    let failedCount = 0;
    const errorsList = [];

    for (const row of rows) {
      const legacyId = row.legacy_emp_id || row.uppid || '';
      const leaveType = row.leave_type || '';
      const fromDateStr = row.from_date || '';
      const toDateStr = row.to_date || '';
      const leaveStatus = row.status || row.leave_status || 'Pending';
      const reason = row.reason || row.leave_reason || '';

      if (!legacyId || !leaveType || !fromDateStr || !toDateStr) {
        failedCount++;
        errorsList.push({ row: legacyId || 'Unknown', error: 'Missing UPPID, Leave Type, or dates' });
        continue;
      }

      const prodRecord = existingEmployees.find(e => e.UPPID === legacyId);
      if (!prodRecord) {
        failedCount++;
        errorsList.push({ row: legacyId, error: `No active employee matches UPPID: ${legacyId}` });
        continue;
      }

      const empId = prodRecord.EmpID;
      const fromDate = new Date(fromDateStr);
      const toDate = new Date(toDateStr);

      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        failedCount++;
        errorsList.push({ row: legacyId, error: `Invalid date formats: ${fromDateStr} or ${toDateStr}` });
        continue;
      }

      if (fromDate > toDate) {
        failedCount++;
        errorsList.push({ row: legacyId, error: 'From Date cannot be after To Date' });
        continue;
      }

      const validTypes = ['Sick Leave', 'Casual Leave', 'Earned Leave', 'Maternity Leave', 'Paternity Leave', 'Unpaid Leave'];
      if (!validTypes.includes(leaveType)) {
        failedCount++;
        errorsList.push({ row: legacyId, error: `Invalid leave type: ${leaveType}` });
        continue;
      }

      const validStatuses = ['Pending', 'Approved', 'Rejected'];
      if (!validStatuses.includes(leaveStatus)) {
        failedCount++;
        errorsList.push({ row: legacyId, error: `Invalid status: ${leaveStatus}` });
        continue;
      }

      const leaveDays = Math.floor((toDate - fromDate) / (1000 * 3600 * 24)) + 1;

      const transaction = new sql.Transaction(pool);
      await transaction.begin();
      try {
        await transaction.request()
          .input('empId', sql.Int, empId)
          .input('leaveType', sql.VarChar, leaveType)
          .input('fromDate', sql.Date, fromDate)
          .input('toDate', sql.Date, toDate)
          .input('reason', sql.VarChar, reason)
          .input('status', sql.VarChar, leaveStatus)
          .input('days', sql.Int, leaveDays)
          .input('adminId', sql.Int, actorId)
          .query(`
            INSERT INTO dbo.EmployeeLeaveDetails 
            (EmpID, LeaveType, FromDate, ToDate, LeaveReason, LeaveStatus, LeaveDays, TotalDays, ApprovedBy, LeaveDate)
            VALUES 
            (@empId, @leaveType, @fromDate, @toDate, @reason, @status, @days, @days, CASE WHEN @status <> 'Pending' THEN @adminId ELSE NULL END, GETDATE())
          `);

        // Notifications & Auditing
        if (leaveStatus !== 'Pending') {
          const auditType = leaveStatus === 'Approved' ? 'LEAVE_APPROVE' : 'LEAVE_REJECT';
          await transaction.request()
            .input('actorId', sql.Int, actorId)
            .input('auditType', sql.VarChar, auditType)
            .input('desc', sql.VarChar, `Imported and set leave status to ${leaveStatus} for employee ID ${empId}`)
            .query('INSERT INTO dbo.AuditLogs (ActorEmpID, ActionType, ActionDesc) VALUES (@actorId, @auditType, @desc)');

          await transaction.request()
            .input('empId', sql.Int, empId)
            .input('title', sql.VarChar, `Leave Request ${leaveStatus}`)
            .input('msg', sql.VarChar, `Your imported leave request from ${fromDateStr} to ${toDateStr} was logged as ${leaveStatus.toLowerCase()}.`)
            .query('INSERT INTO dbo.Notifications (EmpID, Title, Message, IsRead, CreatedAt) VALUES (@empId, @title, @msg, 0, GETDATE())');
        }

        await transaction.commit();
        successCount++;
      } catch (err) {
        await transaction.rollback();
        failedCount++;
        errorsList.push({ row: legacyId, error: err.message });
      }
    }

    const status = failedCount === 0 ? 'Success' : (successCount === 0 ? 'Failed' : 'Partial');
    await pool.request()
      .input('fileType', sql.VarChar, 'Leaves')
      .input('uploadedBy', sql.Int, actorId)
      .input('totalRows', sql.Int, rows.length)
      .input('successRows', sql.Int, successCount)
      .input('failedRows', sql.Int, failedCount)
      .input('status', sql.VarChar, status)
      .query(`
        INSERT INTO dbo.ImportAuditLogs (FileType, UploadedBy, UploadedDate, TotalRows, SuccessRows, FailedRows, Status)
        VALUES (@fileType, @uploadedBy, GETDATE(), @totalRows, @successRows, @failedRows, @status)
      `);

    return { totalProcessed: rows.length, successCount, failedCount, errors: errorsList };
  },

  // 5. SALARY CSV IMPORT
  importSalary: async (rows, actorId) => {
    const pool = await connectDB();
    const existingEmployees = (await pool.request().query(`
      SELECT m.EmpID, d.UPPID FROM dbo.EmployeeMaster m LEFT JOIN dbo.EmployeeDetails d ON m.EmpID = d.EmpID
    `)).recordset;

    let successCount = 0;
    let failedCount = 0;
    const errorsList = [];

    for (const row of rows) {
      const legacyId = row.legacy_emp_id || row.uppid || '';
      const effectiveDateStr = row.effective_date || '';
      const basic = row.basic || row.basic_salary || 0;

      if (!legacyId || !effectiveDateStr) {
        failedCount++;
        errorsList.push({ row: legacyId || 'Unknown', error: 'Missing UPPID or Effective Date' });
        continue;
      }

      const prodRecord = existingEmployees.find(e => e.UPPID === legacyId);
      if (!prodRecord) {
        failedCount++;
        errorsList.push({ row: legacyId, error: `No active employee matches UPPID: ${legacyId}` });
        continue;
      }

      const empId = prodRecord.EmpID;
      const effectiveDate = new Date(effectiveDateStr);
      if (isNaN(effectiveDate.getTime())) {
        failedCount++;
        errorsList.push({ row: legacyId, error: `Invalid effective date: ${effectiveDateStr}` });
        continue;
      }

      const basicSalary = parseFloat(basic);
      const hra = parseFloat(row.hra || row.house_rent_allowance || 0);
      const special = parseFloat(row.special_allowance || 0);
      const medical = parseFloat(row.medical_allowance || 0);
      const conveyance = parseFloat(row.conveyance_allowance || 0);
      const other = parseFloat(row.other_allowance || 0);
      const pfPercent = parseFloat(row.pf_percent || row.provident_fund_percent || 12.00);
      const ptPercent = parseFloat(row.pt_percent || row.professional_tax_percent || 0.40);
      const tds = parseFloat(row.tds || 0);
      const remarks = row.remarks || 'Salary imported revision';

      const transaction = new sql.Transaction(pool);
      await transaction.begin();
      try {
        // Deactivate existing revisions for this employee
        await transaction.request()
          .input('empId', sql.Int, empId)
          .query('UPDATE dbo.SalaryRevisions SET IsActive = 0 WHERE EmpID = @empId');

        // Insert new revision
        await transaction.request()
          .input('empId', sql.Int, empId)
          .input('effectiveDate', sql.Date, effectiveDate)
          .input('basic', sql.Decimal(10, 2), basicSalary)
          .input('hra', sql.Decimal(10, 2), hra)
          .input('special', sql.Decimal(10, 2), special)
          .input('medical', sql.Decimal(10, 2), medical)
          .input('conveyance', sql.Decimal(10, 2), conveyance)
          .input('other', sql.Decimal(10, 2), other)
          .input('pfPercent', sql.Decimal(5, 2), pfPercent)
          .input('ptPercent', sql.Decimal(5, 2), ptPercent)
          .input('tds', sql.Decimal(10, 2), tds)
          .input('remarks', sql.VarChar, remarks)
          .query(`
            INSERT INTO dbo.SalaryRevisions (
              EmpID, EffectiveDate, BasicSalary, HouseRentAllowance, SpecialAllowance, MedicalAllowance, ConveyanceAllowance, OtherAllowance,
              ProvidentFundPercent, ProfessionalTaxPercent, TDS, Remarks, IsActive, CreatedAt
            )
            VALUES (
              @empId, @effectiveDate, @basic, @hra, @special, @medical, @conveyance, @other,
              @pfPercent, @ptPercent, @tds, @remarks, 1, GETDATE()
            )
          `);

        // Log revision addition audit
        await transaction.request()
          .input('actorId', sql.Int, actorId)
          .input('empId', sql.Int, empId)
          .input('desc', sql.VarChar, `Imported salary revision of basic salary ${basicSalary} for Employee ID ${empId}`)
          .query('INSERT INTO dbo.AuditLogs (ActorEmpID, ActionType, ActionDesc) VALUES (@actorId, \'SALARY_REVISION_ADD\', @desc)');

        await transaction.commit();
        successCount++;
      } catch (err) {
        await transaction.rollback();
        failedCount++;
        errorsList.push({ row: legacyId, error: err.message });
      }
    }

    const status = failedCount === 0 ? 'Success' : (successCount === 0 ? 'Failed' : 'Partial');
    await pool.request()
      .input('fileType', sql.VarChar, 'Salary')
      .input('uploadedBy', sql.Int, actorId)
      .input('totalRows', sql.Int, rows.length)
      .input('successRows', sql.Int, successCount)
      .input('failedRows', sql.Int, failedCount)
      .input('status', sql.VarChar, status)
      .query(`
        INSERT INTO dbo.ImportAuditLogs (FileType, UploadedBy, UploadedDate, TotalRows, SuccessRows, FailedRows, Status)
        VALUES (@fileType, @uploadedBy, GETDATE(), @totalRows, @successRows, @failedRows, @status)
      `);

    return { totalProcessed: rows.length, successCount, failedCount, errors: errorsList };
  }
};
