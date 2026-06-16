import { payrollService } from '../services/payrollService.js';
import { exportPayrollSummaryExcel, exportPayrollSummaryCsv } from '../services/exportService.js';
import { downloadPayslipPdf as downloadPayslipPdfService, downloadPayrollSummaryPdf as downloadPayrollSummaryPdfService } from '../services/payslipService.js';


export const runPayroll = async (req, res) => {
  const { month, year } = req.body;

  if (!month || !year) {
    return res.status(400).json({ message: 'Month and year are required.' });
  }

  try {
    const stats = await payrollService.calculateMonthlyPayroll(parseInt(month), parseInt(year), req.user.id);
    res.json({
      message: `Payroll for ${month}/${year} completed successfully.`,
      stats
    });
  } catch (err) {
    console.error('Run payroll error:', err);
    res.status(500).json({ message: `Failed to calculate payroll: ${err.message}` });
  }
};

export const getHistory = async (req, res) => {
  let employeeId = null;
  const month = req.query.month ? parseInt(req.query.month) : null;
  const year = req.query.year ? parseInt(req.query.year) : null;
  const runId = req.query.runId ? parseInt(req.query.runId) : null;
  const isPersonal = req.query.personal === 'true';

  if (req.user.role !== 'SuperAdmin' && req.user.role !== 'HRAdmin' && req.user.role !== 'PayrollAdmin') {
    employeeId = req.user.id;
  } else if (isPersonal) {
    employeeId = req.user.id;
  } else if (req.query.employeeId) {
    employeeId = parseInt(req.query.employeeId);
  }

  try {
    const history = await payrollService.getPayrollHistory(employeeId, month, year, runId);
    res.json(history);
  } catch (err) {
    console.error('Get payroll history error:', err);
    res.status(500).json({ message: 'Failed to fetch payroll history.' });
  }
};

export const getPayslip = async (req, res) => {
  const payrollId = parseInt(req.params.id);
  const employeeId = req.user.role !== 'employee' ? null : req.user.id;

  if (isNaN(payrollId)) {
    return res.status(400).json({ message: 'Invalid payroll ID.' });
  }

  try {
    const payslip = await payrollService.getPayslip(payrollId, employeeId);
    res.json(payslip);
  } catch (err) {
    console.error('Get payslip error:', err);
    const statusCode = err.message === 'Unauthorized access to this payslip.' ? 403 : 404;
    res.status(statusCode).json({ message: err.message });
  }
};

export const updatePaymentStatus = async (req, res) => {
  const payrollId = parseInt(req.params.id);
  const { status } = req.body;

  if (isNaN(payrollId) || !status) {
    return res.status(400).json({ message: 'Payroll ID and status are required.' });
  }

  try {
    const record = await payrollService.updatePaymentStatus(payrollId, status);
    res.json({
      message: 'Payment status updated successfully.',
      record
    });
  } catch (err) {
    console.error('Update payment status error:', err);
    res.status(400).json({ message: err.message });
  }
};

export const getPayrollRuns = async (req, res) => {
  try {
    const runs = await payrollService.getPayrollRuns();
    res.json(runs);
  } catch (err) {
    console.error('Get payroll runs error:', err);
    res.status(500).json({ message: 'Failed to fetch payroll runs.' });
  }
};

export const updatePayrollRunStatus = async (req, res) => {
  const runId = parseInt(req.params.id, 10);
  const { status } = req.body;

  if (isNaN(runId) || !status) {
    return res.status(400).json({ message: 'Run ID and status are required.' });
  }

  try {
    const run = await payrollService.updatePayrollRunStatus(runId, status, req.user.id);
    res.json({ message: `Payroll run status updated to ${status}.`, run });
  } catch (err) {
    console.error('Update payroll run status error:', err);
    res.status(400).json({ message: err.message });
  }
};

export const createSalaryRevision = async (req, res) => {
  try {
    const id = await payrollService.createSalaryRevision(req.body, req.user.id);
    res.status(201).json({ message: 'Salary revision created successfully.', revisionId: id });
  } catch (err) {
    console.error('Create salary revision error:', err);
    res.status(400).json({ message: err.message });
  }
};

export const getSalaryRevisions = async (req, res) => {
  let empId = parseInt(req.params.empId, 10);

  if (req.user.role === 'employee' && req.user.id !== empId) {
    return res.status(403).json({ message: 'Access denied.' });
  }

  try {
    const revisions = await payrollService.getSalaryRevisions(empId);
    res.json(revisions);
  } catch (err) {
    console.error('Get salary revisions error:', err);
    res.status(500).json({ message: 'Failed to fetch salary revisions.' });
  }
};

export const getPayrollReport = async (req, res) => {
  try {
    const report = await payrollService.getPayrollReport();
    res.json(report);
  } catch (err) {
    console.error('Get payroll report error:', err);
    res.status(500).json({ message: 'Failed to fetch payroll report.' });
  }
};

export const getLeavesReport = async (req, res) => {
  try {
    const report = await payrollService.getLeavesReport();
    res.json(report);
  } catch (err) {
    console.error('Get leaves report error:', err);
    res.status(500).json({ message: 'Failed to fetch leaves report.' });
  }
};

export const downloadPayrollSummary = async (req, res) => {
  try {
    await downloadPayrollSummaryPdf(res);
  } catch (err) {
    console.error('Download payroll summary error:', err);
    res.status(500).json({ message: err.message });
  }
};

export const getEmployeesReport = async (req, res) => {
  try {
    const report = await payrollService.getEmployeesReport();
    res.json(report);
  } catch (err) {
    console.error('Get employees report error:', err);
    res.status(500).json({ message: 'Failed to fetch employees report.' });
  }
};

export const getDashboardStats = async (req, res) => {
  try {
    const stats = await payrollService.getDashboardStats();
    res.json(stats);
  } catch (err) {
    console.error('Get dashboard stats error:', err);
    res.status(500).json({ message: 'Failed to fetch dashboard statistics.' });
  }
};

export const requestRunApprovalOtp = async (req, res) => {
  try {
    const result = await payrollService.generateApprovalOtp(req.user.id);
    res.json(result);
  } catch (err) {
    console.error('Request run approval OTP error:', err);
    res.status(400).json({ message: err.message });
  }
};

export const verifyRunApprovalOtp = async (req, res) => {
  const { otpCode, runId } = req.body;
  if (!otpCode) {
    return res.status(400).json({ message: 'OTP code is required.' });
  }
  try {
    const result = await payrollService.verifyApprovalOtpAndApprove(req.user.id, otpCode, runId);
    res.json(result);
  } catch (err) {
    console.error('Verify run approval OTP error:', err);
    res.status(400).json({ message: err.message });
  }
};

export const getReconciliationReport = async (req, res) => {
  const runId = parseInt(req.params.id, 10);
  if (isNaN(runId)) {
    return res.status(400).json({ message: 'Invalid run ID.' });
  }
  try {
    const result = await payrollService.getReconciliationReport(runId);
    res.json(result);
  } catch (err) {
    console.error('Get reconciliation report error:', err);
    res.status(400).json({ message: err.message });
  }
};

export const downloadPayslipPdf = async (req, res) => {
  const payrollId = parseInt(req.params.id, 10);
  const employeeId = (req.user.role === 'SuperAdmin' || req.user.role === 'HRAdmin' || req.user.role === 'PayrollAdmin') ? null : req.user.id;

  try {
    await downloadPayslipPdfService(payrollId, employeeId, res);
  } catch (err) {
    console.error('Download payslip PDF error:', err);
    if (!res.headersSent) {
      res.status(500).json({ message: err.message || 'Failed to download payslip PDF.' });
    }
  }
};

export const downloadPayrollSummaryPdf = async (req, res) => {
  const runId = parseInt(req.params.id, 10);
  try {
    await downloadPayrollSummaryPdfService(runId, res);
  } catch (err) {
    console.error('Download summary PDF error:', err);
    if (!res.headersSent) {
      res.status(500).json({ message: err.message || 'Failed to download summary PDF.' });
    }
  }
};

export const downloadPayrollSummaryExcel = async (req, res) => {
  const runId = parseInt(req.params.id, 10);
  try {
    await exportPayrollSummaryExcel(runId, res);
  } catch (err) {
    console.error('Download summary Excel error:', err);
    if (!res.headersSent) {
      res.status(500).json({ message: err.message || 'Failed to download summary Excel.' });
    }
  }
};

export const downloadPayrollSummaryCsv = async (req, res) => {
  const runId = parseInt(req.params.id, 10);
  try {
    await exportPayrollSummaryCsv(runId, res);
  } catch (err) {
    console.error('Download summary CSV error:', err);
    if (!res.headersSent) {
      res.status(500).json({ message: err.message || 'Failed to download summary CSV.' });
    }
  }
};

import { connectDB as getPool } from '../config/db.js';
export const getLatestOtpForTest = async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT TOP 1 OtpCode FROM dbo.PayrollApprovalOtp ORDER BY CreatedAt DESC');
    res.json({ otpCode: result.recordset[0]?.OtpCode || '' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getPayrollConfirmationData = async (req, res) => {
  const month = parseInt(req.query.month);
  const year  = parseInt(req.query.year);
  if (!month || !year) return res.status(400).json({ message: 'month and year are required.' });
  try {
    const data = await payrollService.getPayrollConfirmationData(month, year);
    res.json(data);
  } catch (err) {
    console.error('Get confirmation data error:', err);
    res.status(500).json({ message: err.message });
  }
};

export const releasePayroll = async (req, res) => {
  const runId = parseInt(req.params.id, 10);
  if (isNaN(runId)) return res.status(400).json({ message: 'Invalid run ID.' });
  try {
    const result = await payrollService.releasePayroll(runId, req.user.id);
    res.json(result);
  } catch (err) {
    console.error('Release payroll error:', err);
    res.status(400).json({ message: err.message });
  }
};

export const getPayrollRunHistory = async (req, res) => {
  try {
    const history = await payrollService.getPayrollRunHistory();
    res.json(history);
  } catch (err) {
    console.error('Get run history error:', err);
    res.status(500).json({ message: err.message });
  }
};

export const getEmployeeHrManager = async (req, res) => {
  try {
    const data = await payrollService.getEmployeeHrManager(req.user.id);
    res.json(data);
  } catch (err) {
    console.error('Get HR manager error:', err);
    res.status(500).json({ message: err.message });
  }
};

export const getReportData = async (req, res) => {
  const type = req.params.type;
  const month = req.query.month ? parseInt(req.query.month) : null;
  const year = req.query.year ? parseInt(req.query.year) : null;
  const department = req.query.department || null;

  try {
    let data = [];
    if (type === 'payroll-monthly') data = await payrollService.getMonthlyPayrollReport(month, year);
    else if (type === 'payroll-yearly') data = await payrollService.getYearlyPayrollReport(year);
    else if (type === 'payroll-dept') data = await payrollService.getDepartmentPayrollReport(month, year, department);
    else if (type === 'attendance') data = await payrollService.getAttendanceReport(month, year, department);
    else if (type === 'leaves') data = await payrollService.getLeavesReport(department);
    else if (type === 'revisions') data = await payrollService.getSalaryRevisionReport(department);
    else if (type === 'inactive') data = await payrollService.getInactiveEmployeesReport(department);
    // Keep old types for backwards compatibility temporarily
    else if (type === 'payroll') data = await payrollService.getMonthlyPayrollReport(month, year);
    else if (type === 'employees') data = await payrollService.getInactiveEmployeesReport(department);
    else return res.status(400).json({ message: 'Unknown report type' });

    res.json(data);
  } catch (err) {
    console.error('Get report data error:', err);
    res.status(500).json({ message: 'Failed to get report data' });
  }
};

export const exportReport = async (req, res) => {
  const type = req.params.type;
  const format = req.query.format || 'csv';
  const month = req.query.month ? parseInt(req.query.month) : null;
  const year = req.query.year ? parseInt(req.query.year) : null;
  const department = req.query.department || null;

  try {
    let data = [];
    if (type === 'payroll-monthly') data = await payrollService.getMonthlyPayrollReport(month, year);
    else if (type === 'payroll-yearly') data = await payrollService.getYearlyPayrollReport(year);
    else if (type === 'payroll-dept') data = await payrollService.getDepartmentPayrollReport(month, year, department);
    else if (type === 'attendance') data = await payrollService.getAttendanceReport(month, year, department);
    else if (type === 'leaves') data = await payrollService.getLeavesReport(department);
    else if (type === 'revisions') data = await payrollService.getSalaryRevisionReport(department);
    else if (type === 'inactive') data = await payrollService.getInactiveEmployeesReport(department);
    // Keep old types for backwards compatibility temporarily
    else if (type === 'payroll') data = await payrollService.getMonthlyPayrollReport(month, year);
    else if (type === 'employees') data = await payrollService.getInactiveEmployeesReport(department);
    else return res.status(400).json({ message: 'Unknown report type' });

    if (data.length === 0) return res.status(404).json({ message: 'No data to export' });

    if (format === 'csv') {
      const { Parser } = await import('json2csv');
      const csv = new Parser().parse(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="Report_${type}.csv"`);
      res.send(csv);
    } else if (format === 'excel') {
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Report');
      worksheet.columns = Object.keys(data[0]).map(k => ({ header: k, key: k, width: 15 }));
      data.forEach(row => worksheet.addRow(row));
      worksheet.getRow(1).font = { bold: true };
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="Report_${type}.xlsx"`);
      await workbook.xlsx.write(res);
      res.end();
    } else if (format === 'pdf') {
      const PDFDocumentWithTable = (await import('pdfkit-table')).default;
      const doc = new PDFDocumentWithTable({ size: 'A4', margin: 40 });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Report_${type}.pdf"`);
      doc.pipe(res);
      
      // Header background
      doc.rect(40, 40, 515, 80).fill('#1F2937'); // Dark slate

      // Company Name
      doc.fillColor('#FFFFFF').fontSize(20).text('NEXUS PAYROLL', 60, 55);
      doc.fontSize(9).fillColor('#94A3B8').text('Hyderabad, India', 60, 85);
      
      doc.fontSize(14).fillColor('#FFFFFF').text(`${type.toUpperCase()} REPORT`, 250, 75, { width: 285, align: 'right' });
      
      doc.y = 150; // Move below the header
      doc.fillColor('#1E293B');
      
      const headers = Object.keys(data[0]);
      const table = {
        title: "",
        headers: headers,
        rows: data.map(row => headers.map(h => String(row[h] || '')))
      };
      
      await doc.table(table, {
        x: 40,
        prepareHeader: () => doc.font('Helvetica-Bold').fontSize(8),
        prepareRow: () => doc.font('Helvetica').fontSize(8)
      });
      
      doc.end();
    } else {
      res.status(400).json({ message: 'Invalid format' });
    }
  } catch (err) {
    console.error('Export error:', err);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Failed to export report' });
    }
  }
};

export const deletePayrollRun = async (req, res) => {
  try {
    const runId = req.params.id;
    await payrollService.deletePayrollRun(runId);
    res.json({ message: 'Payroll run deleted successfully' });
  } catch (err) {
    console.error('Delete run error:', err);
    res.status(500).json({ message: err.message || 'Failed to delete payroll run' });
  }
};
