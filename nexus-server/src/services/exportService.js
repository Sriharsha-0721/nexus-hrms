import ExcelJS from 'exceljs';
import { Parser } from 'json2csv';
import { connectDB, sql } from '../config/db.js';

export const exportPayrollSummaryExcel = async (runId, res) => {
  const pool = await connectDB();
  const employeesResult = await pool.request()
    .input('runId', sql.Int, runId)
    .query(`
      SELECT p.EmpID AS 'Employee ID', e.FullName AS 'Employee Name', 
             COALESCE(NULLIF(m.Department, ''), dept.DepartmentName) AS 'Department',
             COALESCE(NULLIF(m.Designation, ''), desig.DesignationName) AS 'Designation',
             p.DaysInMonth AS 'Days In Month', p.DaysPaid AS 'Days Paid', p.LossOfPay AS 'LOP Days',
             p.BasicSalary AS 'Basic Salary', p.HouseRentAllowance AS 'HRA', p.SpecialAllowance AS 'Special',
             p.TotalEarnings AS 'Gross Salary',
             p.ProvidentFund AS 'PF', p.ProfessionalTax AS 'PT', p.TDS AS 'TDS', p.TotalDeductions AS 'Total Deductions',
             p.NetSalaryPaid AS 'Net Pay'
      FROM dbo.EmployeeSalarysDetails p
      JOIN dbo.EmployeeMaster m ON p.EmpID = m.EmpID
      LEFT JOIN dbo.EmployeeDetails e ON p.EmpID = e.EmpID
      LEFT JOIN dbo.Departments dept ON m.DepartmentID = dept.DepartmentID
      LEFT JOIN dbo.Designations desig ON m.DesignationID = desig.DesignationID
      WHERE p.RunID = @runId
      ORDER BY Department, e.FullName
    `);

  if (employeesResult.recordset.length === 0) {
    throw new Error('No data found for this run.');
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Payroll Summary');

  worksheet.columns = Object.keys(employeesResult.recordset[0]).map(key => ({
    header: key,
    key: key,
    width: 15
  }));

  employeesResult.recordset.forEach(row => {
    worksheet.addRow(row);
  });

  worksheet.getRow(1).font = { bold: true };

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="Payroll_Summary_Run_${runId}.xlsx"`);
  
  await workbook.xlsx.write(res);
  res.end();
};

export const exportPayrollSummaryCsv = async (runId, res) => {
  const pool = await connectDB();
  const employeesResult = await pool.request()
    .input('runId', sql.Int, runId)
    .query(`
      SELECT p.EmpID AS 'Employee ID', e.FullName AS 'Employee Name', 
             COALESCE(NULLIF(m.Department, ''), dept.DepartmentName) AS 'Department',
             COALESCE(NULLIF(m.Designation, ''), desig.DesignationName) AS 'Designation',
             p.DaysInMonth AS 'Days In Month', p.DaysPaid AS 'Days Paid', p.LossOfPay AS 'LOP Days',
             p.BasicSalary AS 'Basic Salary', p.HouseRentAllowance AS 'HRA', p.SpecialAllowance AS 'Special',
             p.TotalEarnings AS 'Gross Salary',
             p.ProvidentFund AS 'PF', p.ProfessionalTax AS 'PT', p.TDS AS 'TDS', p.TotalDeductions AS 'Total Deductions',
             p.NetSalaryPaid AS 'Net Pay'
      FROM dbo.EmployeeSalarysDetails p
      JOIN dbo.EmployeeMaster m ON p.EmpID = m.EmpID
      LEFT JOIN dbo.EmployeeDetails e ON p.EmpID = e.EmpID
      LEFT JOIN dbo.Departments dept ON m.DepartmentID = dept.DepartmentID
      LEFT JOIN dbo.Designations desig ON m.DesignationID = desig.DesignationID
      WHERE p.RunID = @runId
      ORDER BY Department, e.FullName
    `);

  if (employeesResult.recordset.length === 0) {
    throw new Error('No data found for this run.');
  }

  const json2csvParser = new Parser();
  const csv = json2csvParser.parse(employeesResult.recordset);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="Payroll_Summary_Run_${runId}.csv"`);
  
  res.send(csv);
};
