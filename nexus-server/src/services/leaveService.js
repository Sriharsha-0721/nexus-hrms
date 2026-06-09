import { connectDB, sql } from '../config/db.js';

export const leaveService = {
  /**
   * Calculate leave balances for an employee in the current year
   */
  getLeaveBalances: async (employeeId) => {
    const pool = await connectDB();
    const currentYear = new Date().getFullYear();

    // Fetch policies dynamically from SQL Server
    const policiesResult = await pool.request().query('SELECT LeaveType, MaxAllowedDays FROM dbo.LeavePolicies');
    const policiesMap = {};
    policiesResult.recordset.forEach(row => {
      policiesMap[row.LeaveType] = row.MaxAllowedDays;
    });

    // Sum up approved leaves by type for this calendar year
    const approvedResult = await pool.request()
      .input('employeeId', sql.Int, employeeId)
      .input('currentYear', sql.Int, currentYear)
      .query(`
        SELECT LeaveType AS leave_type, 
               SUM(DATEDIFF(day, FromDate, ToDate) + 1) AS approved_days
        FROM dbo.EmployeeLeaveDetails
        WHERE EmpID = @employeeId 
          AND LeaveStatus = 'Approved' 
          AND YEAR(FromDate) = @currentYear
        GROUP BY LeaveType
      `);

    // Map approved days
    const approvedMap = {};
    approvedResult.recordset.forEach(row => {
      approvedMap[row.leave_type] = row.approved_days;
    });

    // Construct balances list
    const balances = {};
    Object.keys(policiesMap).forEach(type => {
      const allowed = policiesMap[type];
      const taken = approvedMap[type] || 0;
      balances[type] = {
        allowed,
        taken,
        remaining: Math.max(0, allowed - taken)
      };
    });

    return balances;
  },

  /**
   * Apply for leave
   */
  applyLeave: async (employeeId, data) => {
    const pool = await connectDB();
    const { leaveType, startDate, endDate, reason } = data;

    if (!leaveType || !startDate || !endDate) {
      throw new Error('Leave type, start date, and end date are required.');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Invalid date format. Use YYYY-MM-DD.');
    }

    if (start > end) {
      throw new Error('Start date cannot be after end date.');
    }

    // Calculate requested days
    const daysRequested = Math.floor((end - start) / (1000 * 3600 * 24)) + 1;

    // Check balances
    const balances = await leaveService.getLeaveBalances(employeeId);
    const typeBalance = balances[leaveType];

    if (!typeBalance) {
      throw new Error(`Invalid leave type: '${leaveType}'`);
    }

    if (leaveType !== 'Unpaid Leave' && daysRequested > typeBalance.remaining) {
      throw new Error(`Insufficient leave balance. Remaining: ${typeBalance.remaining} days, Requested: ${daysRequested} days.`);
    }

    const result = await pool.request()
      .input('employeeId', sql.Int, employeeId)
      .input('leaveType', sql.VarChar, leaveType)
      .input('startDate', sql.Date, startDate)
      .input('endDate', sql.Date, endDate)
      .input('reason', sql.VarChar, reason || null)
      .input('days', sql.Int, daysRequested)
      .query(`
        INSERT INTO dbo.EmployeeLeaveDetails (EmpID, LeaveType, FromDate, ToDate, LeaveReason, LeaveStatus, LeaveDays, TotalDays)
        OUTPUT inserted.LeaveID AS leave_id, inserted.EmpID AS employee_id, inserted.LeaveType AS leave_type, inserted.FromDate AS start_date, inserted.ToDate AS end_date, inserted.LeaveStatus AS status
        VALUES (@employeeId, @leaveType, @startDate, @endDate, @reason, 'Pending', @days, @days)
      `);

    return result.recordset[0];
  },

  /**
   * Approve or reject a leave request
   */
  approveRejectLeave: async (leaveId, status, adminId) => {
    if (status !== 'Approved' && status !== 'Rejected') {
      throw new Error('Status must be Approved or Rejected.');
    }

    const pool = await connectDB();

    // Check if leave exists and is Pending
    const checkResult = await pool.request()
      .input('leaveId', sql.Int, leaveId)
      .query('SELECT LeaveID AS leave_id, EmpID AS employee_id, LeaveType AS leave_type, FromDate AS start_date, ToDate AS end_date, LeaveStatus AS status FROM dbo.EmployeeLeaveDetails WHERE LeaveID = @leaveId');

    if (checkResult.recordset.length === 0) {
      throw new Error('Leave request not found.');
    }

    const leaveRequest = checkResult.recordset[0];
    if (leaveRequest.status !== 'Pending') {
      throw new Error(`Leave request has already been ${leaveRequest.status.toLowerCase()}.`);
    }

    // If approving, re-verify leave balance for safety
    if (status === 'Approved') {
      const daysRequested = Math.floor((new Date(leaveRequest.end_date) - new Date(leaveRequest.start_date)) / (1000 * 3600 * 24)) + 1;
      const balances = await leaveService.getLeaveBalances(leaveRequest.employee_id);
      const remaining = balances[leaveRequest.leave_type].remaining;

      if (leaveRequest.leave_type !== 'Unpaid Leave' && daysRequested > remaining) {
        throw new Error(`Insufficient leave balance remaining to approve. Remaining: ${remaining} days, Requested: ${daysRequested} days.`);
      }
    }

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // 1. Update status
      const result = await transaction.request()
        .input('leaveId', sql.Int, leaveId)
        .input('status', sql.VarChar, status)
        .input('adminId', sql.Int, adminId)
        .query(`
          UPDATE dbo.EmployeeLeaveDetails
          SET LeaveStatus = @status, ApprovedBy = @adminId
          OUTPUT inserted.LeaveID AS leave_id, inserted.EmpID AS employee_id, inserted.LeaveType AS leave_type, inserted.LeaveStatus AS status, inserted.ApprovedBy AS approved_by
          WHERE LeaveID = @leaveId
        `);

      const updatedRecord = result.recordset[0];

      // 2. Audit Log
      const auditAction = status === 'Approved' ? 'LEAVE_APPROVE' : 'LEAVE_REJECT';
      const auditDesc = `Leave request ID ${leaveId} for employee ID ${leaveRequest.employee_id} was ${status} by admin ID ${adminId}`;
      await transaction.request()
        .input('actorEmpId', sql.Int, adminId)
        .input('actionType', sql.VarChar, auditAction)
        .input('actionDesc', sql.VarChar, auditDesc)
        .query(`
          INSERT INTO dbo.AuditLogs (ActorEmpID, ActionType, ActionDesc)
          VALUES (@actorEmpId, @actionType, @actionDesc)
        `);

      // 3. Notification
      const formattedStart = new Date(leaveRequest.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      const formattedEnd = new Date(leaveRequest.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      const notificationTitle = `Leave Request ${status}`;
      const notificationMsg = `Your leave request for ${leaveRequest.leave_type} from ${formattedStart} to ${formattedEnd} has been ${status.toLowerCase()}.`;
      
      await transaction.request()
        .input('empId', sql.Int, leaveRequest.employee_id)
        .input('title', sql.VarChar, notificationTitle)
        .input('message', sql.VarChar, notificationMsg)
        .query(`
          INSERT INTO dbo.Notifications (EmpID, Title, Message, IsRead, CreatedAt)
          VALUES (@empId, @title, @message, 0, GETDATE())
        `);

      await transaction.commit();
      return updatedRecord;
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  /**
   * Get leave requests
   */
  getLeaveRequests: async (employeeId) => {
    const pool = await connectDB();
    let query = `
      SELECT l.LeaveID AS leave_id, l.EmpID AS employee_id, l.LeaveType AS leave_type, l.FromDate AS start_date, l.ToDate AS end_date, l.LeaveReason AS reason, l.LeaveStatus AS status, l.LeaveDate AS applied_date,
             e.FirstName AS first_name, e.LastName AS last_name, d.UPPID AS legacy_emp_id,
             a.FirstName AS approver_first_name, a.LastName AS approver_last_name
      FROM dbo.EmployeeLeaveDetails l
      JOIN dbo.EmployeeMaster e ON l.EmpID = e.EmpID
      LEFT JOIN dbo.EmployeeDetails d ON e.EmpID = d.EmpID
      LEFT JOIN dbo.EmployeeMaster a ON l.ApprovedBy = a.EmpID
    `;

    const request = pool.request();

    if (employeeId) {
      query += ` WHERE l.EmpID = @employeeId`;
      request.input('employeeId', sql.Int, employeeId);
    }

    query += ` ORDER BY l.LeaveDate DESC, l.LeaveID DESC`;
    const result = await request.query(query);
    return result.recordset;
  },

  /**
   * Get all leave policies (Admin only)
   */
  getLeavePolicies: async () => {
    const pool = await connectDB();
    const result = await pool.request().query(`
      SELECT PolicyID AS id, LeaveType AS leaveType, MaxAllowedDays AS maxAllowedDays, IsCarryForward AS isCarryForward
      FROM dbo.LeavePolicies
      ORDER BY PolicyID ASC
    `);
    return result.recordset;
  },

  /**
   * Update a leave policy (Admin only)
   */
  updateLeavePolicy: async (id, data) => {
    const { maxAllowedDays, isCarryForward } = data;
    const pool = await connectDB();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('maxAllowedDays', sql.Int, maxAllowedDays)
      .input('isCarryForward', sql.Bit, isCarryForward ? 1 : 0)
      .query(`
        UPDATE dbo.LeavePolicies
        SET MaxAllowedDays = @maxAllowedDays, IsCarryForward = @isCarryForward
        WHERE PolicyID = @id
      `);
    if (result.rowsAffected[0] === 0) {
      throw new Error('Leave policy not found.');
    }
    return true;
  }
};
