import { leaveService } from '../services/leaveService.js';

export const applyLeave = async (req, res) => {
  try {
    const record = await leaveService.applyLeave(req.user.id, req.body);
    res.status(201).json({
      message: 'Leave request submitted successfully.',
      record
    });
  } catch (err) {
    console.error('Apply leave error:', err);
    res.status(400).json({ message: err.message });
  }
};

export const getBalances = async (req, res) => {
  let employeeId = req.user.id;

  // Admin can query balance for another employee
  if (req.user.role === 'admin' && req.query.employeeId) {
    employeeId = parseInt(req.query.employeeId);
  }

  try {
    const balances = await leaveService.getLeaveBalances(employeeId);
    res.json(balances);
  } catch (err) {
    console.error('Get balances error:', err);
    res.status(500).json({ message: 'Failed to fetch leave balances.' });
  }
};

export const getRequests = async (req, res) => {
  let employeeId = null;

  // Non-admins can only see their own requests
  if (req.user.role !== 'admin') {
    employeeId = req.user.id;
  } else if (req.query.employeeId) {
    // Admin can filter by employeeId
    employeeId = parseInt(req.query.employeeId);
  }

  try {
    const requests = await leaveService.getLeaveRequests(employeeId);
    res.json(requests);
  } catch (err) {
    console.error('Get requests error:', err);
    res.status(500).json({ message: 'Failed to fetch leave requests.' });
  }
};

export const approveRejectLeave = async (req, res) => {
  const { leaveId, status } = req.body;

  if (!leaveId || !status) {
    return res.status(400).json({ message: 'Leave ID and Status are required.' });
  }

  try {
    const record = await leaveService.approveRejectLeave(leaveId, status, req.user.id);
    res.json({
      message: `Leave request successfully ${status.toLowerCase()}.`,
      record
    });
  } catch (err) {
    console.error('Approve/Reject leave error:', err);
    res.status(400).json({ message: err.message });
  }
};
