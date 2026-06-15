import PDFDocument from 'pdfkit';
import path from 'path';
import { connectDB, sql } from '../config/db.js';

const formatCurrency = (val) => {
  if (val === undefined || val === null) return '₹0.00';
  return '₹' + Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const numberToWords = (num) => {
  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertLessThanOneThousand = (n) => {
    if (n === 0) return '';
    let str = '';
    if (n >= 100) {
      str += a[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n > 0) {
      if (n < 20) {
        str += a[n];
      } else {
        str += b[Math.floor(n / 10)];
        if (n % 10 > 0) {
          str += ' ' + a[n % 10];
        }
      }
    }
    return str.trim();
  };

  let n = Math.floor(num);
  if (n === 0) return 'Rupees Zero Only';

  let crore = Math.floor(n / 10000000);
  n %= 10000000;
  let lakh = Math.floor(n / 100000);
  n %= 100000;
  let thousand = Math.floor(n / 1000);
  n %= 1000;
  let remaining = n;

  let result = '';
  if (crore > 0) {
    result += convertLessThanOneThousand(crore) + ' Crore ';
  }
  if (lakh > 0) {
    result += convertLessThanOneThousand(lakh) + ' Lakh ';
  }
  if (thousand > 0) {
    result += convertLessThanOneThousand(thousand) + ' Thousand ';
  }
  if (remaining > 0) {
    result += convertLessThanOneThousand(remaining);
  }

  return 'Rupees ' + result.trim().replace(/\s+/g, ' ') + ' Only';
};

export const downloadPayslipPdf = async (payrollId, employeeId, res) => {
  const pool = await connectDB();
  const result = await pool.request()
    .input('payrollId', sql.Int, payrollId)
    .query(`
       SELECT p.EmpID, p.SalaryMonth, p.SalaryYear, p.DaysInMonth, p.DaysPaid, p.LossOfPay, p.BasicSalary, p.HouseRentAllowance, p.SpecialAllowance, p.MedicalAllowance, p.ConveyanceAllowance, p.OtherAllowance, p.TotalEarnings, p.ProvidentFund, p.ProfessionalTax, p.TDS, p.TotalDeductions, p.NetSalaryPaid, p.PaymentStatus,
               COALESCE(p.EmployeeName, e.FullName, m.FirstName + ' ' + m.LastName) AS FullName, e.PANNo, e.AadharNo, e.UANNo, e.EmailID AS PersonalEmail, e.BankName, e.BankAccountNo, e.IFSCCode, e.OfficialEmail,
               COALESCE(p.Designation, NULLIF(m.Designation, ''), desig.DesignationName) AS Designation, 
               COALESCE(p.Department, NULLIF(m.Department, ''), dept.DepartmentName) AS Department, 
               m.DOJ, m.EmpStatus AS EmployeeStatus,
              mgr.FirstName + ' ' + mgr.LastName AS ManagerName,
              run.Version AS PayrollVersion, run.RunDate AS ReleaseDate,
              p.AbsentDays, p.UnpaidLeaveDays
       FROM dbo.EmployeeSalarysDetails p
       LEFT JOIN dbo.EmployeeDetails e ON p.EmpID = e.EmpID
       LEFT JOIN dbo.EmployeeMaster m ON p.EmpID = m.EmpID
       LEFT JOIN dbo.Departments dept ON m.DepartmentID = dept.DepartmentID
       LEFT JOIN dbo.Designations desig ON m.DesignationID = desig.DesignationID
       LEFT JOIN dbo.EmployeeReporting rep ON p.EmpID = rep.EmployeeEmpID
       LEFT JOIN dbo.EmployeeMaster mgr ON rep.ManagerEmpID = mgr.EmpID
       LEFT JOIN dbo.PayrollRuns run ON p.RunID = run.RunID
       WHERE p.SalaryID = @payrollId
    `);

  if (result.recordset.length === 0) {
    throw new Error('Payslip not found');
  }

  const data = result.recordset[0];
  if (employeeId && data.EmpID !== employeeId) {
    throw new Error('Unauthorized access to this payslip.');
  }

  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const fontPath = path.resolve('assets/NotoSans-Regular.ttf');
  doc.registerFont('NotoSans', fontPath);
  
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="Payslip_${data.EmpID}_${data.SalaryMonth}_${data.SalaryYear}.pdf"`);
  doc.pipe(res);

  const monthNames = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
  const salaryMonthName = monthNames[data.SalaryMonth - 1] || data.SalaryMonth;

  // Header background
  doc.rect(40, 40, 515, 80).fill('#1F2937'); // Dark slate

  // Company Name
  doc.fillColor('#FFFFFF').fontSize(20).font('NotoSans').text('NEXUS PAYROLL', 60, 55);
  doc.fontSize(9).fillColor('#94A3B8').text('Hyderabad, India', 60, 85);
  
  // Right side text
  doc.fontSize(9).fillColor('#94A3B8').text(`PAN: AAAA1234F | GST: 36AAAA1234F1Z0`, 300, 55, { width: 235, align: 'right' });
  doc.fontSize(14).fillColor('#FFFFFF').text('PAYSLIP', 300, 75, { width: 235, align: 'right' });

  // Title
  doc.moveDown(2);
  doc.fontSize(14).fillColor('#1E293B').font('NotoSans').text(`SALARY SLIP FOR ${salaryMonthName} ${data.SalaryYear}`, 40, 140);
  doc.fontSize(8).fillColor('#94A3B8').text(`Generated On: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 40, 155);
  doc.moveTo(40, 170).lineTo(555, 170).strokeColor('#2563EB').lineWidth(2).stroke();

  // Employee details grid
  doc.fontSize(9);
  let startY = 180;
  const col1 = 40;
  const col2 = 145;
  const col3 = 300;
  const col4 = 405;
  const lineHeight = 16;

  const dojFormatted = data.DOJ ? new Date(data.DOJ).toLocaleDateString('en-GB') : '-';

  const details = [
    { k1: 'Employee Name', v1: data.FullName, k2: 'Employee ID', v2: data.EmpID },
    { k1: 'Designation', v1: data.Designation || '-', k2: 'Department', v2: data.Department || '-' },
    { k1: 'Date of Joining', v1: dojFormatted, k2: 'Employee Status', v2: data.EmployeeStatus || 'Active' },
    { k1: 'Official Email', v1: data.OfficialEmail || '-', k2: 'Reporting Manager', v2: data.ManagerName || '-' },
    { k1: 'PAN', v1: data.PANNo || '-', k2: 'UAN', v2: data.UANNo || '-' },
    { k1: 'Bank', v1: data.BankName || '-', k2: 'Account No', v2: data.BankAccountNo || '-' },
    { k1: 'Payroll Month', v1: salaryMonthName, k2: 'Payroll Year', v2: String(data.SalaryYear) },
    { k1: 'Payroll Run Version', v1: data.PayrollVersion ? `v${data.PayrollVersion}` : 'v1', k2: 'Payment Status', v2: data.PaymentStatus || 'Paid' }
  ];

  details.forEach((row, i) => {
    const y = startY + (i * lineHeight);
    doc.fillColor('#64748B').text(row.k1, col1, y);
    doc.fillColor('#0F172A').text(row.v1, col2, y);
    doc.fillColor('#64748B').text(row.k2, col3, y);
    doc.fillColor('#0F172A').text(row.v2, col4, y);
  });

  // Attendance details block
  const attY = startY + (details.length * lineHeight) + 10;
  doc.rect(40, attY, 515, 35).fill('#F8FAFC').strokeColor('#E2E8F0').lineWidth(1).stroke();
  
  doc.fontSize(8).fillColor('#64748B');
  doc.text('Calendar Days', 50, attY + 8);
  doc.text('Present Days', 130, attY + 8);
  doc.text('Absent Days', 210, attY + 8);
  doc.text('LOP Days', 290, attY + 8);
  doc.text('Paid Days', 370, attY + 8);
  doc.text('Attendance %', 450, attY + 8);
  
  const calendarDays = data.DaysInMonth || 30;
  const rawLop = data.LossOfPay || 0;
  let lopDays = 0;
  let lopAmount = 0;
  
  if (rawLop > 31) {
    lopAmount = rawLop;
    lopDays = (data.AbsentDays || 0) + (data.UnpaidLeaveDays || 0);
  } else {
    lopDays = rawLop;
    lopAmount = 0;
  }
  
  const paidDays = data.DaysPaid || (calendarDays - lopDays);
  const presentDays = paidDays; 
  const absentDays = lopDays;   
  const attPercent = ((paidDays / calendarDays) * 100).toFixed(2) + '%';

  doc.fontSize(9).fillColor('#0F172A');
  doc.text(String(calendarDays), 50, attY + 20);
  doc.text(String(presentDays), 130, attY + 20);
  doc.text(String(absentDays), 210, attY + 20);
  doc.text(String(lopDays), 290, attY + 20);
  doc.text(String(paidDays), 370, attY + 20);
  doc.text(attPercent, 450, attY + 20);

  // Table Headers
  let tableY = attY + 45;
  doc.rect(40, tableY, 515, 25).fill('#1E293B');
  doc.fillColor('#FFFFFF').fontSize(10);
  doc.text('EARNINGS', 50, tableY + 8);
  doc.text('AMOUNT', 200, tableY + 8, { width: 90, align: 'right' });
  doc.text('DEDUCTIONS', 310, tableY + 8);
  doc.text('AMOUNT', 450, tableY + 8, { width: 90, align: 'right' });

  // Center divider line for header
  doc.moveTo(300, tableY).lineTo(300, tableY + 25).strokeColor('#FFFFFF').lineWidth(1).stroke();

  tableY += 25;
  doc.fillColor('#0F172A').fontSize(10);

  const earnings = [
    ['Basic Salary', data.BasicSalary],
    ['House Rent Allowance', data.HouseRentAllowance],
    ['Special Allowance', data.SpecialAllowance],
    ['Other Allowances', data.OtherAllowance || 0]
  ];

  const deductions = [
    ['Provident Fund', data.ProvidentFund],
    ['Professional Tax', data.ProfessionalTax],
    ['Loss of Pay (LOP)', lopAmount],
    ['TDS', data.TDS]
  ];

  for (let i = 0; i < 4; i++) {
    const y = tableY + (i * 25);
    
    // Stripe background
    if (i % 2 === 0) {
      doc.rect(40, y, 515, 25).fill('#F8FAFC');
    } else {
      doc.rect(40, y, 515, 25).fill('#FFFFFF');
    }

    doc.fillColor('#475569');
    // Earnings
    if (earnings[i]) {
      doc.text(earnings[i][0], 50, y + 8);
      doc.text(formatCurrency(earnings[i][1]), 200, y + 8, { width: 90, align: 'right' });
    }
    
    // Deductions
    if (deductions[i]) {
      doc.text(deductions[i][0], 310, y + 8);
      doc.text(formatCurrency(deductions[i][1]), 450, y + 8, { width: 90, align: 'right' });
    }
    
    // Left and right border and middle line for table
    doc.moveTo(40, y).lineTo(40, y+25).strokeColor('#E2E8F0').lineWidth(1).stroke();
    doc.moveTo(555, y).lineTo(555, y+25).strokeColor('#E2E8F0').lineWidth(1).stroke();
    doc.moveTo(300, y).lineTo(300, y+25).strokeColor('#E2E8F0').lineWidth(1).stroke();
  }

  // Gross Totals
  const grossY = tableY + (4 * 25);
  doc.rect(40, grossY, 515, 30).fill('#E2E8F0');
  
  doc.fillColor('#0F172A').font('NotoSans');
  doc.text('Gross Earnings', 50, grossY + 10);
  doc.text(formatCurrency(data.TotalEarnings), 200, grossY + 10, { width: 90, align: 'right' });
  
  doc.text('Total Deductions', 310, grossY + 10);
  doc.text(formatCurrency(data.TotalDeductions), 450, grossY + 10, { width: 90, align: 'right' });

  // Border wrapper for total
  doc.rect(40, tableY, 515, 100).strokeColor('#CBD5E1').lineWidth(1).stroke();

  // Salary Summary (Derivation Explanation Card)
  const summaryY = grossY + 40;
  doc.rect(40, summaryY, 515, 50).fill('#F1F5F9').strokeColor('#CBD5E1').lineWidth(1).stroke();
  
  doc.fontSize(8).fillColor('#475569');
  doc.text('(A) Total Earnings', 55, summaryY + 10);
  doc.text('(B) Total Deductions', 200, summaryY + 10);
  doc.text('Net Salary (A - B)', 350, summaryY + 10);
  
  doc.fontSize(10).fillColor('#0F172A').font('NotoSans');
  doc.text(formatCurrency(data.TotalEarnings), 55, summaryY + 22);
  doc.text(formatCurrency(data.TotalDeductions), 200, summaryY + 22);
  
  doc.fontSize(11).fillColor('#2563EB').font('NotoSans');
  doc.text(formatCurrency(data.NetSalaryPaid), 350, summaryY + 21);
  
  doc.fontSize(7.5).fillColor('#64748B').font('NotoSans');
  doc.text('Net Salary = (Gross Earnings) - (Total Deductions)', 55, summaryY + 38);

  // Net Salary in Words
  const wordsY = summaryY + 60;
  doc.fontSize(9).fillColor('#1E293B').font('NotoSans');
  doc.text(`Amount in Words: ${numberToWords(data.NetSalaryPaid)}`, 40, wordsY);

  // Footer
  const footerY = 740;
  doc.moveTo(40, footerY).lineTo(555, footerY).strokeColor('#E2E8F0').lineWidth(1).stroke();
  
  doc.fontSize(8).fillColor('#64748B');
  doc.text(`Generated By: System Admin`, 40, footerY + 10);
  doc.text(`Payroll Version: ${data.PayrollVersion ? 'v' + data.PayrollVersion : 'v1'}`, 180, footerY + 10);
  
  const releaseDate = data.ReleaseDate ? new Date(data.ReleaseDate).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');
  doc.text(`Release Date: ${releaseDate}`, 320, footerY + 10);
  
  doc.text('This is a system generated payslip and does not require a signature.', 40, footerY + 25, { align: 'center', width: 515 });

  doc.end();
};

export const downloadPayrollSummaryPdf = async (runId, res) => {
  const pool = await connectDB();
  
  const runResult = await pool.request()
    .input('runId', sql.Int, runId)
    .query('SELECT * FROM dbo.PayrollRuns WHERE RunID = @runId');
    
  if (runResult.recordset.length === 0) throw new Error('Run not found');
  const run = runResult.recordset[0];

  const summaryResult = await pool.request()
    .input('runId', sql.Int, runId)
    .query('SELECT * FROM dbo.PayrollRunSummary WHERE RunID = @runId');
  const summary = summaryResult.recordset[0] || {};

  const employeesResult = await pool.request()
    .input('runId', sql.Int, runId)
    .query(`
      SELECT p.EmpID, 
             COALESCE(p.EmployeeName, e.FullName, m.FirstName + ' ' + m.LastName) AS FullName, 
             COALESCE(p.Department, NULLIF(m.Department, ''), dept.DepartmentName) AS Department, 
             p.TotalEarnings, p.TotalDeductions, p.NetSalaryPaid
      FROM dbo.EmployeeSalarysDetails p
      JOIN dbo.EmployeeMaster m ON p.EmpID = m.EmpID
      LEFT JOIN dbo.EmployeeDetails e ON p.EmpID = e.EmpID
      LEFT JOIN dbo.Departments dept ON m.DepartmentID = dept.DepartmentID
      WHERE p.RunID = @runId
      ORDER BY Department, FullName
    `);

  const exceptionsResult = await pool.request()
    .input('runId', sql.Int, runId)
    .query(`
      SELECT x.EmpID, m.FirstName + ' ' + m.LastName AS FullName, x.ExceptionType, x.ExceptionMessage
      FROM dbo.PayrollExceptions x
      JOIN dbo.EmployeeMaster m ON x.EmpID = m.EmpID
      WHERE x.RunID = @runId
    `);

  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const fontPath = path.resolve('assets/NotoSans-Regular.ttf');
  doc.registerFont('NotoSans', fontPath);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="Payroll_Summary_Run_${runId}.pdf"`);
  doc.pipe(res);

  // Header background
  doc.rect(40, 40, 515, 80).fill('#1F2937'); // Dark slate

  // Company Name
  doc.fillColor('#FFFFFF').fontSize(20).font('NotoSans').text('NEXUS PAYROLL', 60, 55);
  doc.fontSize(9).fillColor('#94A3B8').text('Hyderabad, India', 60, 85);
  
  doc.fontSize(14).fillColor('#FFFFFF').text('PAYROLL SUMMARY REPORT', 250, 75, { width: 285, align: 'right' });

  // Title
  doc.moveDown(2);
  const monthNames = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
  doc.fontSize(12).fillColor('#1E293B').font('NotoSans').text(`Month: ${monthNames[run.SalaryMonth - 1]} ${run.SalaryYear}`, 40, 140);
  doc.text(`Version: ${run.Version}`, 40, 155);
  
  // In a real app we'd fetch the generated by user. Defaulting to superadmin.
  doc.text(`Generated By: System Admin`, 300, 140, { align: 'right', width: 255 });
  doc.text(`Released By: System Admin`, 300, 155, { align: 'right', width: 255 });
  
  doc.moveTo(40, 175).lineTo(555, 175).strokeColor('#2563EB').lineWidth(2).stroke();

  // --- Stats Header ---
  doc.fontSize(12).fillColor('#1F2937').text('EMPLOYEE STATISTICS', 40, 190);
  doc.fontSize(10).fillColor('#475569');
  
  const totalEmps = (summary.EmployeesProcessed || 0) + (summary.EmployeesSkipped || 0);
  doc.text(`Total Employees: ${totalEmps}`, 40, 210);
  doc.text(`Processed Employees: ${summary.EmployeesProcessed || 0}`, 40, 225);
  doc.text(`Skipped Employees: ${summary.EmployeesSkipped || 0}`, 200, 210);
  doc.text(`Inactive Employees: 0`, 200, 225);

  // --- Financials ---
  doc.moveTo(40, 245).lineTo(555, 245).strokeColor('#E2E8F0').lineWidth(1).stroke();
  doc.fontSize(12).fillColor('#1F2937').text('FINANCIAL SUMMARY', 40, 260);
  
  const finY = 280;
  doc.rect(40, finY, 515, 85).fill('#F8FAFC').strokeColor('#E2E8F0').lineWidth(1).stroke();
  
  doc.fontSize(10).fillColor('#475569');
  doc.text(`Total Gross Payroll: ₹ ${Number(summary.GrossAmount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}`, 60, finY + 15);
  doc.text(`Total PF: ₹ ${Number(summary.TotalPF || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}`, 280, finY + 15);
  doc.text(`Total PT: ₹ ${Number(summary.TotalPT || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}`, 60, finY + 35);
  doc.text(`Total TDS: ₹ ${Number(summary.TotalTDS || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}`, 280, finY + 35);
  doc.text(`Total LOP: ₹ ${Number(summary.TotalLOP || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}`, 60, finY + 55);
  
  doc.fontSize(12).fillColor('#2563EB').text(`Net Payroll: ₹ ${Number(summary.NetPayable || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}`, 280, finY + 55);
  
  doc.y = finY + 110;
  doc.fillColor('#1E293B');

  // --- Exceptions ---
  doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#E2E8F0').lineWidth(1).stroke();
  doc.moveDown(1);
  doc.fontSize(12).fillColor('#1F2937').text('EXCEPTIONS', 40, doc.y);
  doc.moveDown(0.5);
  
  if (exceptionsResult.recordset.length > 0) {
    doc.fontSize(10).fillColor('#475569');
    doc.text('Employee Name', 40, doc.y);
    doc.text('Reason', 200, doc.y);
    doc.moveDown(0.5);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#E2E8F0').lineWidth(1).stroke();
    doc.moveDown(0.5);
    
    exceptionsResult.recordset.forEach(ex => {
      doc.text(`${ex.FullName} (${ex.EmpID})`, 40, doc.y);
      doc.text(`${ex.ExceptionType}: ${ex.ExceptionMessage}`, 200, doc.y);
      doc.moveDown(0.5);
    });
  } else {
    doc.fontSize(10).fillColor('#475569').text('No exceptions found.', 40, doc.y).moveDown(1);
  }

  // --- Department Rollup Table ---
  doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#E2E8F0').lineWidth(1).stroke();
  doc.moveDown(1);
  doc.fontSize(12).fillColor('#1F2937').text('DEPARTMENT SUMMARY', 40, doc.y);
  doc.moveDown(0.5);
  
  const depts = {};
  employeesResult.recordset.forEach(e => {
    if (!depts[e.Department]) depts[e.Department] = { count: 0, gross: 0, net: 0 };
    depts[e.Department].count++;
    depts[e.Department].gross += e.TotalEarnings || 0;
    depts[e.Department].net += e.NetSalaryPaid || 0;
  });

  let deptY = doc.y;
  doc.rect(40, deptY, 515, 25).fill('#1E293B');
  doc.fillColor('#FFFFFF').fontSize(10);
  doc.text('Department', 50, deptY + 8);
  doc.text('Employee Count', 200, deptY + 8);
  doc.text('Payroll Cost', 350, deptY + 8);

  deptY += 25;
  Object.keys(depts).forEach((d, i) => {
    if (i % 2 === 0) doc.rect(40, deptY, 515, 25).fill('#F8FAFC');
    else doc.rect(40, deptY, 515, 25).fill('#FFFFFF');
    
    doc.fillColor('#475569');
    doc.text(d, 50, deptY + 8);
    doc.text(depts[d].count.toString(), 200, deptY + 8);
    doc.text(`₹ ${depts[d].gross.toLocaleString('en-IN', {minimumFractionDigits: 2})}`, 350, deptY + 8);
    
    doc.moveTo(40, deptY).lineTo(40, deptY+25).strokeColor('#E2E8F0').lineWidth(1).stroke();
    doc.moveTo(555, deptY).lineTo(555, deptY+25).strokeColor('#E2E8F0').lineWidth(1).stroke();
    deptY += 25;
  });
  doc.moveTo(40, deptY).lineTo(555, deptY).strokeColor('#E2E8F0').lineWidth(1).stroke();

  // --- Employee Breakdown ---
  if (doc.y > 650) doc.addPage();
  doc.moveDown(2);
  doc.fontSize(12).fillColor('#1F2937').text('EMPLOYEE BREAKDOWN', 40, doc.y);
  doc.moveDown(0.5);
  
  let empY = doc.y;
  doc.rect(40, empY, 515, 25).fill('#1E293B');
  doc.fillColor('#FFFFFF').fontSize(9);
  doc.text('Employee', 50, empY + 8);
  doc.text('Department', 200, empY + 8);
  doc.text('Gross', 350, empY + 8);
  doc.text('Net Pay', 450, empY + 8);

  empY += 25;
  employeesResult.recordset.forEach((e, i) => {
    if (empY > 750) {
      doc.addPage();
      empY = 40;
      doc.rect(40, empY, 515, 25).fill('#1E293B');
      doc.fillColor('#FFFFFF').fontSize(9);
      doc.text('Employee', 50, empY + 8);
      doc.text('Department', 200, empY + 8);
      doc.text('Gross', 350, empY + 8);
      doc.text('Net Pay', 450, empY + 8);
      empY += 25;
    }

    if (i % 2 === 0) doc.rect(40, empY, 515, 25).fill('#F8FAFC');
    else doc.rect(40, empY, 515, 25).fill('#FFFFFF');
    
    doc.fillColor('#475569');
    doc.text(`${e.FullName} (${e.EmpID})`, 50, empY + 8);
    doc.text(e.Department || '-', 200, empY + 8);
    doc.text(`₹ ${(e.TotalEarnings || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}`, 350, empY + 8);
    doc.text(`₹ ${(e.NetSalaryPaid || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}`, 450, empY + 8);
    
    doc.moveTo(40, empY).lineTo(40, empY+25).strokeColor('#E2E8F0').lineWidth(1).stroke();
    doc.moveTo(555, empY).lineTo(555, empY+25).strokeColor('#E2E8F0').lineWidth(1).stroke();
    empY += 25;
  });
  doc.moveTo(40, empY).lineTo(555, empY).strokeColor('#E2E8F0').lineWidth(1).stroke();

  doc.y = empY + 20;
  doc.fontSize(8).fillColor('#94A3B8').text(`Generated On: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 40, doc.y);

  doc.end();
};
