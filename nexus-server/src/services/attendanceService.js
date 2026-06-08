import { connectDB, sql } from '../config/db.js';

export const attendanceService = {
  /**
   * Clock in an employee for today
   */
  clockIn: async (employeeId) => {
    const pool = await connectDB();
    const today = new Date().toISOString().split('T')[0];

    // Check if employee already clocked in today
    const checkResult = await pool.request()
      .input('employeeId', sql.Int, employeeId)
      .input('today', sql.Date, today)
      .query('SELECT AttendanceID FROM dbo.EmployeeAttendance WHERE EmpID = @employeeId AND AttendanceDate = @today');

    if (checkResult.recordset.length > 0) {
      throw new Error('Already clocked in for today.');
    }

    const now = new Date();
    const clockInTime = now.toTimeString().split(' ')[0]; // HH:MM:SS

    const result = await pool.request()
      .input('employeeId', sql.Int, employeeId)
      .input('today', sql.Date, today)
      .input('clockIn', sql.VarChar, clockInTime)
      .input('checkInTime', sql.DateTime, now)
      .query(`
        INSERT INTO dbo.EmployeeAttendance (EmpID, AttendanceDate, ClockIn, CheckInTime, AttendanceStatus)
        OUTPUT inserted.AttendanceID AS attendance_id, inserted.AttendanceDate AS date, inserted.ClockIn AS clock_in, inserted.AttendanceStatus AS status
        VALUES (@employeeId, @today, CAST(@clockIn AS TIME), @checkInTime, 'Present')
      `);

    return result.recordset[0];
  },

  /**
   * Clock out an employee for today
   */
  clockOut: async (employeeId) => {
    const pool = await connectDB();
    const today = new Date().toISOString().split('T')[0];

    // Get today's clock-in details
    const result = await pool.request()
      .input('employeeId', sql.Int, employeeId)
      .input('today', sql.Date, today)
      .query('SELECT * FROM dbo.EmployeeAttendance WHERE EmpID = @employeeId AND AttendanceDate = @today');

    if (result.recordset.length === 0) {
      throw new Error('No clock-in record found for today. Please clock in first.');
    }

    const attendance = result.recordset[0];
    if (attendance.ClockOut) {
      throw new Error('Already clocked out for today.');
    }

    const now = new Date();
    const clockOutTime = now.toTimeString().split(' ')[0]; // HH:MM:SS

    // Calculate total hours
    const clockInTimeStr = attendance.ClockIn.toISOString().split('T')[1].substring(0, 8); // get HH:MM:SS
    const [inH, inM, inS] = clockInTimeStr.split(':').map(Number);
    const [outH, outM, outS] = clockOutTime.split(':').map(Number);

    const clockInMs = (inH * 3600 + inM * 60 + inS) * 1000;
    const clockOutMs = (outH * 3600 + outM * 60 + outS) * 1000;
    const totalHours = Math.max(0, (clockOutMs - clockInMs) / (1000 * 60 * 60));

    // Progress decimal checkout time: hours + minutes / 60
    const checkOutTimeDecimal = parseFloat((outH + outM / 60).toFixed(2));

    const updateResult = await pool.request()
      .input('attendanceId', sql.Int, attendance.AttendanceID)
      .input('clockOut', sql.VarChar, clockOutTime)
      .input('totalHours', sql.Decimal(5, 2), parseFloat(totalHours.toFixed(2)))
      .input('checkOutTimeDecimal', sql.Decimal(5, 2), checkOutTimeDecimal)
      .query(`
        UPDATE dbo.EmployeeAttendance 
        SET ClockOut = CAST(@clockOut AS TIME), TotalHours = @totalHours, CheckOutTime = @checkOutTimeDecimal
        OUTPUT inserted.AttendanceID AS attendance_id, inserted.AttendanceDate AS date, inserted.ClockIn AS clock_in, inserted.ClockOut AS clock_out, inserted.AttendanceStatus AS status, inserted.TotalHours AS total_hours
        WHERE AttendanceID = @attendanceId
      `);

    return updateResult.recordset[0];
  },

  /**
   * Get attendance logs for an employee or all employees (for admin)
   */
  getAttendanceLogs: async (employeeId, month, year) => {
    const pool = await connectDB();
    let query = `
      SELECT a.AttendanceID AS attendance_id, a.EmpID AS employee_id, a.AttendanceDate AS date, a.ClockIn AS clock_in, a.ClockOut AS clock_out, a.AttendanceStatus AS status, a.TotalHours AS total_hours,
             e.FirstName AS first_name, e.LastName AS last_name, d.UPPID AS legacy_emp_id
      FROM dbo.EmployeeAttendance a
      JOIN dbo.EmployeeMaster e ON a.EmpID = e.EmpID
      LEFT JOIN dbo.EmployeeDetails d ON e.EmpID = d.EmpID
      WHERE MONTH(a.AttendanceDate) = @month AND YEAR(a.AttendanceDate) = @year
    `;

    const request = pool.request()
      .input('month', sql.Int, month)
      .input('year', sql.Int, year);

    if (employeeId) {
      query += ` AND a.EmpID = @employeeId`;
      request.input('employeeId', sql.Int, employeeId);
    }

    query += ` ORDER BY a.AttendanceDate DESC`;
    const result = await request.query(query);
    return result.recordset;
  },

  /**
   * Manually adjust an attendance record (Admin only)
   */
  adjustAttendance: async (attendanceId, data) => {
    const pool = await connectDB();
    const { clockIn, clockOut, status } = data;

    // Check if record exists
    const checkResult = await pool.request()
      .input('attendanceId', sql.Int, attendanceId)
      .query('SELECT * FROM dbo.EmployeeAttendance WHERE AttendanceID = @attendanceId');

    if (checkResult.recordset.length === 0) {
      throw new Error('Attendance record not found.');
    }

    let totalHours = null;
    let checkOutTimeDecimal = null;
    if (clockIn && clockOut) {
      const [inH, inM] = clockIn.split(':').map(Number);
      const [outH, outM] = clockOut.split(':').map(Number);
      totalHours = Math.max(0, (outH * 3600 + outM * 60 - (inH * 3600 + inM * 60)) / 3600);
      checkOutTimeDecimal = parseFloat((outH + outM / 60).toFixed(2));
    }

    const updateResult = await pool.request()
      .input('attendanceId', sql.Int, attendanceId)
      .input('clockIn', sql.VarChar, clockIn ? `${clockIn}:00` : null)
      .input('clockOut', sql.VarChar, clockOut ? `${clockOut}:00` : null)
      .input('status', sql.VarChar, status || 'Present')
      .input('totalHours', sql.Decimal(5, 2), totalHours !== null ? parseFloat(totalHours.toFixed(2)) : null)
      .input('checkOutTimeDecimal', sql.Decimal(5, 2), checkOutTimeDecimal)
      .query(`
        UPDATE dbo.EmployeeAttendance
        SET ClockIn = CASE WHEN @clockIn IS NOT NULL THEN CAST(@clockIn AS TIME) ELSE ClockIn END,
            ClockOut = CASE WHEN @clockOut IS NOT NULL THEN CAST(@clockOut AS TIME) ELSE ClockOut END,
            AttendanceStatus = @status,
            TotalHours = CASE WHEN @totalHours IS NOT NULL THEN @totalHours ELSE TotalHours END,
            CheckOutTime = CASE WHEN @checkOutTimeDecimal IS NOT NULL THEN @checkOutTimeDecimal ELSE CheckOutTime END
        OUTPUT inserted.AttendanceID AS attendance_id, inserted.AttendanceDate AS date, inserted.ClockIn AS clock_in, inserted.ClockOut AS clock_out, inserted.AttendanceStatus AS status, inserted.TotalHours AS total_hours
        WHERE AttendanceID = @attendanceId
      `);

    return updateResult.recordset[0];
  }
};
