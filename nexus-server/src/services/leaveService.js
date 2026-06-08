import { connectDB, sql } from '../config/db.js';

// Annual Leave Allowances
const LEAVE_ALLOWANCES = {
  'Sick Leave': 10,
  'Casual Leave': 12,
  'Earned Leave': 15,
  'Paternity Leave': 10,
  'Maternity Leave': 90,
  'Unpaid Leave': 365 // Cap
};

export const leaveService = {
  /**
   * Calculate leave balances for an employee in the current year
   */
  getLeaveBalances: async (employeeId) => {
    const pool = await connectDB();
    const currentYear = new Date().getFullYear();

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
    Object.keys(LEAVE_ALLOWANCES).forEach(type => {
      const allowed = LEAVE_ALLOWANCES[type];
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

    const result = await pool.request()
      .input('leaveId', sql.Int, leaveId)
      .input('status', sql.VarChar, status)
      .input('adminId', sql.Int, adminId)
      .query(`
        UPDATE dbo.EmployeeLeaveDetails
        SET LeaveStatus = @status, ApprovedBy = @adminId
        OUTPUT inserted.LeaveID AS leave_id, inserted.EmpID AS employee_id, inserted.LeaveType AS leave_type, inserted.LeaveStatus AS status, inserted.ApprovedBy AS approved_by
        WHERE LeaveID = @leaveId
      `);

    return result.recordset[0];
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
  }
};
