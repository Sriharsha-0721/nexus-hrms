import { payrollService } from '../services/payrollService.js';

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

  if (req.user.role !== 'admin') {
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
  const employeeId = req.user.role === 'admin' ? null : req.user.id;

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

  if (req.user.role !== 'admin' && req.user.id !== empId) {
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
  const runId = parseInt(req.params.id, 10);
  if (isNaN(runId)) {
    return res.status(400).json({ message: 'Invalid run ID.' });
  }
  try {
    const result = await payrollService.generateApprovalOtp(runId, req.user.id);
    res.json(result);
  } catch (err) {
    console.error('Request run approval OTP error:', err);
    res.status(400).json({ message: err.message });
  }
};

export const verifyRunApprovalOtp = async (req, res) => {
  const runId = parseInt(req.params.id, 10);
  const { otpCode } = req.body;
  if (isNaN(runId) || !otpCode) {
    return res.status(400).json({ message: 'Run ID and OTP code are required.' });
  }
  try {
    const result = await payrollService.verifyApprovalOtpAndApprove(runId, req.user.id, otpCode);
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
  const employeeId = req.user.role === 'admin' ? null : req.user.id;

  try {
    await payrollService.downloadPayslipPdf(payrollId, employeeId, res);
  } catch (err) {
    console.error('Download payslip PDF error:', err);
    if (!res.headersSent) {
      res.status(500).json({ message: err.message || 'Failed to download payslip PDF.' });
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
