import { connectDB, sql } from '../config/db.js';

const escapeCSV = (val) => {
  if (val === null || val === undefined) return '';
  let str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    str = '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
};

const formatTimeVal = (val) => {
  if (!val) return '';
  if (val instanceof Date) {
    return val.toISOString().split('T')[1].substring(0, 8);
  }
  if (typeof val === 'string') {
    return val.split('.')[0];
  }
  return String(val);
};

const formatDateVal = (val) => {
  if (!val) return '';
  if (val instanceof Date) {
    return val.toISOString().split('T')[0];
  }
  if (typeof val === 'string') {
    return val.split('T')[0];
  }
  return String(val);
};

export const exportData = async (req, res) => {
  const { type } = req.params;
  const role = req.user.role;

  // RBAC validation
  const hrExports = ['roster', 'attendance', 'leaves'];
  const payrollExports = ['salary'];

  if (hrExports.includes(type) && !['SuperAdmin', 'HRAdmin'].includes(role)) {
    return res.status(403).json({ message: 'Access forbidden: Only SuperAdmin and HRAdmin can export this data.' });
  }

  if (payrollExports.includes(type) && !['SuperAdmin', 'PayrollAdmin'].includes(role)) {
    return res.status(403).json({ message: 'Access forbidden: Only SuperAdmin and PayrollAdmin can export this data.' });
  }

  try {
    const pool = await connectDB();
    let csvContent = '';
    let filename = '';

    if (type === 'roster') {
      const result = await pool.request().query(`
        SELECT m.EmpID, d.UPPID, m.FirstName, m.LastName, d.EmailID, m.DOJ, m.EmpStatus,
               dept.DepartmentName, des.DesignationName, d.Phone, d.AadharNo, d.PANNo, d.UANNo,
               d.BankName, d.BankAccountNo, d.IFSCCode
        FROM dbo.EmployeeMaster m
        LEFT JOIN dbo.EmployeeDetails d ON m.EmpID = d.EmpID
        LEFT JOIN dbo.Departments dept ON m.DepartmentID = dept.DepartmentID
        LEFT JOIN dbo.Designations des ON m.DesignationID = des.DesignationID
        ORDER BY m.EmpID ASC
      `);

      const headers = ['EmpID', 'UPPID', 'First Name', 'Last Name', 'Email', 'DOJ', 'Status', 'Department', 'Designation', 'Phone', 'Aadhar No', 'PAN No', 'UAN No', 'Bank Name', 'Bank Account No', 'IFSC Code'];
      csvContent += headers.map(escapeCSV).join(',') + '\n';

      result.recordset.forEach(row => {
        const line = [
          row.EmpID,
          row.UPPID,
          row.FirstName,
          row.LastName,
          row.EmailID,
          formatDateVal(row.DOJ),
          row.EmpStatus,
          row.DepartmentName,
          row.DesignationName,
          row.Phone,
          row.AadharNo,
          row.PANNo,
          row.UANNo,
          row.BankName,
          row.BankAccountNo,
          row.IFSCCode
        ];
        csvContent += line.map(escapeCSV).join(',') + '\n';
      });

      filename = 'Employee_Roster.csv';

    } else if (type === 'attendance') {
      const result = await pool.request().query(`
        SELECT a.AttendanceID, d.UPPID, m.FirstName + ' ' + m.LastName AS FullName,
               a.AttendanceDate, a.AttendanceStatus, a.ClockIn, a.ClockOut, a.TotalHours
        FROM dbo.EmployeeAttendance a
        JOIN dbo.EmployeeMaster m ON a.EmpID = m.EmpID
        LEFT JOIN dbo.EmployeeDetails d ON m.EmpID = d.EmpID
        ORDER BY a.AttendanceDate DESC, m.EmpID ASC
      `);

      const headers = ['AttendanceID', 'UPPID', 'Employee Name', 'Date', 'Status', 'Clock In', 'Clock Out', 'Total Hours'];
      csvContent += headers.map(escapeCSV).join(',') + '\n';

      result.recordset.forEach(row => {
        const line = [
          row.AttendanceID,
          row.UPPID,
          row.FullName,
          formatDateVal(row.AttendanceDate),
          row.AttendanceStatus,
          formatTimeVal(row.ClockIn),
          formatTimeVal(row.ClockOut),
          row.TotalHours
        ];
        csvContent += line.map(escapeCSV).join(',') + '\n';
      });

      filename = 'Employee_Attendance.csv';

    } else if (type === 'leaves') {
      const result = await pool.request().query(`
        SELECT l.LeaveID, d.UPPID, m.FirstName + ' ' + m.LastName AS FullName,
               l.LeaveType, l.FromDate, l.ToDate, l.LeaveStatus, l.LeaveDays, l.LeaveReason
        FROM dbo.EmployeeLeaveDetails l
        JOIN dbo.EmployeeMaster m ON l.EmpID = m.EmpID
        LEFT JOIN dbo.EmployeeDetails d ON m.EmpID = d.EmpID
        ORDER BY l.FromDate DESC, m.EmpID ASC
      `);

      const headers = ['LeaveID', 'UPPID', 'Employee Name', 'Leave Type', 'From Date', 'To Date', 'Status', 'Days', 'Reason'];
      csvContent += headers.map(escapeCSV).join(',') + '\n';

      result.recordset.forEach(row => {
        const line = [
          row.LeaveID,
          row.UPPID,
          row.FullName,
          row.LeaveType,
          formatDateVal(row.FromDate),
          formatDateVal(row.ToDate),
          row.LeaveStatus,
          row.LeaveDays,
          row.LeaveReason
        ];
        csvContent += line.map(escapeCSV).join(',') + '\n';
      });

      filename = 'Employee_Leaves.csv';

    } else if (type === 'salary') {
      const result = await pool.request().query(`
        SELECT s.SalaryID, d.UPPID, m.FirstName + ' ' + m.LastName AS FullName,
               s.SalaryMonth, s.SalaryYear, s.DaysPaid, s.LossOfPay,
               s.BasicSalary, s.HouseRentAllowance, s.SpecialAllowance,
               s.MedicalAllowance, s.ConveyanceAllowance, s.OtherAllowance,
               s.ProvidentFund, s.ProfessionalTax, s.TDS,
               s.TotalEarnings, s.TotalDeductions, s.NetSalaryPaid,
               s.PaymentStatus, s.RunID
        FROM dbo.EmployeeSalarysDetails s
        JOIN dbo.EmployeeMaster m ON s.EmpID = m.EmpID
        LEFT JOIN dbo.EmployeeDetails d ON m.EmpID = d.EmpID
        ORDER BY s.SalaryYear DESC, s.SalaryMonth DESC, m.EmpID ASC
      `);

      const headers = [
        'SalaryID', 'UPPID', 'Employee Name', 'Month', 'Year', 'Days Paid', 'LOP Days',
        'Basic Salary', 'HRA', 'Special Allowance', 'Medical Allowance', 'Conveyance Allowance', 'Other Allowance',
        'Provident Fund', 'Professional Tax', 'TDS', 'Total Earnings', 'Total Deductions', 'Net Salary Paid',
        'Payment Status', 'RunID'
      ];
      csvContent += headers.map(escapeCSV).join(',') + '\n';

      result.recordset.forEach(row => {
        const line = [
          row.SalaryID,
          row.UPPID,
          row.FullName,
          row.SalaryMonth,
          row.SalaryYear,
          row.DaysPaid,
          row.LossOfPay,
          row.BasicSalary,
          row.HouseRentAllowance,
          row.SpecialAllowance,
          row.MedicalAllowance,
          row.ConveyanceAllowance,
          row.OtherAllowance,
          row.ProvidentFund,
          row.ProfessionalTax,
          row.TDS,
          row.TotalEarnings,
          row.TotalDeductions,
          row.NetSalaryPaid,
          row.PaymentStatus,
          row.RunID
        ];
        csvContent += line.map(escapeCSV).join(',') + '\n';
      });

      filename = 'Employee_Salary_Payouts.csv';

    } else {
      return res.status(400).json({ message: `Invalid export type: '${type}'. Supported types: roster, attendance, leaves, salary.` });
    }

    // Set Response Headers
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    return res.status(200).send(csvContent);

  } catch (err) {
    console.error(`CSV Export Controller Error (${type}): `, err);
    res.status(500).json({ message: `Failed to export CSV file: ${err.message}` });
  }
};
