import express from 'express';
import { 
  runPayroll,
  getHistory,
  getPayslip,
  updatePaymentStatus,
  getPayrollRuns,
  updatePayrollRunStatus,
  createSalaryRevision,
  getSalaryRevisions,
  getPayrollReport,
  getLeavesReport,
  getEmployeesReport,
  getDashboardStats,
  requestRunApprovalOtp,
  verifyRunApprovalOtp,
  getReconciliationReport,
  downloadPayslipPdf,
  downloadPayrollSummaryPdf,
  downloadPayrollSummaryExcel,
  downloadPayrollSummaryCsv,
  getLatestOtpForTest,
  getPayrollConfirmationData,
  releasePayroll,
  getPayrollRunHistory,
  getEmployeeHrManager,
  exportReport,
  getReportData,
  deletePayrollRun
} from '../controllers/payrollController.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Pre-flight confirmation data (before generating payroll)
router.get('/confirm', verifyToken, requireRole(['SuperAdmin', 'PayrollAdmin']), getPayrollConfirmationData);

router.post('/run', verifyToken, requireRole(['SuperAdmin', 'PayrollAdmin']), runPayroll);
router.get('/history', verifyToken, getHistory);
router.get('/payslip/:id', verifyToken, getPayslip);
router.put('/status/:id', verifyToken, requireRole(['SuperAdmin', 'PayrollAdmin']), updatePaymentStatus);

// Runs & Lifecycle
router.get('/runs', verifyToken, getPayrollRuns);
router.put('/runs/:id/status', verifyToken, requireRole(['SuperAdmin', 'PayrollAdmin']), updatePayrollRunStatus);
router.post('/runs/:id/release', verifyToken, requireRole(['SuperAdmin', 'PayrollAdmin']), releasePayroll);
router.delete('/runs/:id', verifyToken, requireRole(['SuperAdmin', 'PayrollAdmin']), deletePayrollRun);

// Full run history (for Payroll History screen)
router.get('/run-history', verifyToken, requireRole(['SuperAdmin', 'PayrollAdmin', 'HRAdmin']), getPayrollRunHistory);

// Salary Revisions
router.post('/revisions', verifyToken, requireRole(['SuperAdmin', 'PayrollAdmin']), createSalaryRevision);
router.get('/revisions/:empId', verifyToken, getSalaryRevisions);

// Reports
router.get('/reports/:type', verifyToken, requireRole(['SuperAdmin', 'PayrollAdmin', 'HRAdmin']), getReportData);
router.get('/reports/:type/export', verifyToken, requireRole(['SuperAdmin', 'PayrollAdmin', 'HRAdmin']), exportReport);

// Dashboard
router.get('/dashboard-stats', verifyToken, requireRole(['SuperAdmin', 'PayrollAdmin', 'HRAdmin']), getDashboardStats);

// Employee HR Admin & Reporting Manager
router.get('/me/hr-manager', verifyToken, getEmployeeHrManager);

// Admin OTP, Reconciliation & PDF Downloads
router.post('/otp-request', verifyToken, requireRole(['SuperAdmin', 'PayrollAdmin']), requestRunApprovalOtp);
router.post('/otp-verify', verifyToken, requireRole(['SuperAdmin', 'PayrollAdmin']), verifyRunApprovalOtp);
router.get('/runs/:id/reconciliation', verifyToken, requireRole(['SuperAdmin', 'PayrollAdmin', 'HRAdmin']), getReconciliationReport);
router.get('/payslips/:id/download', verifyToken, downloadPayslipPdf);
router.get('/summary/:id/download', verifyToken, requireRole(['SuperAdmin', 'PayrollAdmin', 'HRAdmin']), downloadPayrollSummaryPdf);
router.get('/summary/:id/download/excel', verifyToken, requireRole(['SuperAdmin', 'PayrollAdmin', 'HRAdmin']), downloadPayrollSummaryExcel);
router.get('/summary/:id/download/csv', verifyToken, requireRole(['SuperAdmin', 'PayrollAdmin', 'HRAdmin']), downloadPayrollSummaryCsv);
router.get('/latest-otp-for-test', getLatestOtpForTest);

export default router;


