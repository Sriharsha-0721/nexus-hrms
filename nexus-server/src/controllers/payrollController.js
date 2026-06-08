import { payrollService } from '../services/payrollService.js';

export const runPayroll = async (req, res) => {
  const { month, year } = req.body;

  if (!month || !year) {
    return res.status(400).json({ message: 'Month and year are required.' });
  }

  try {
    const stats = await payrollService.calculateMonthlyPayroll(parseInt(month), parseInt(year));
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

  // Enforce access controls: employees can only view their own history
  if (req.user.role !== 'admin') {
    employeeId = req.user.id;
  } else if (req.query.employeeId) {
    employeeId = parseInt(req.query.employeeId);
  }

  try {
    const history = await payrollService.getPayrollHistory(employeeId, month, year);
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
