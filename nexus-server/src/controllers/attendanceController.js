import { attendanceService } from '../services/attendanceService.js';

export const clockIn = async (req, res) => {
  try {
    const record = await attendanceService.clockIn(req.user.id);
    res.status(201).json({
      message: 'Successfully clocked in.',
      record
    });
  } catch (err) {
    console.error('Clock-in error:', err);
    res.status(400).json({ message: err.message });
  }
};

export const clockOut = async (req, res) => {
  try {
    const record = await attendanceService.clockOut(req.user.id);
    res.json({
      message: 'Successfully clocked out.',
      record
    });
  } catch (err) {
    console.error('Clock-out error:', err);
    res.status(400).json({ message: err.message });
  }
};

export const getLogs = async (req, res) => {
  const now = new Date();
  const month = parseInt(req.query.month) || (now.getMonth() + 1);
  const year = parseInt(req.query.year) || now.getFullYear();
  let employeeId = req.query.employeeId ? parseInt(req.query.employeeId) : null;

  // Enforce access controls: Non-admins can only see their own logs
  if (req.user.role !== 'admin') {
    employeeId = req.user.id;
  }

  try {
    const logs = await attendanceService.getAttendanceLogs(employeeId, month, year);
    res.json(logs);
  } catch (err) {
    console.error('Fetch logs error:', err);
    res.status(500).json({ message: 'Failed to fetch attendance logs.' });
  }
};

export const adjustAttendance = async (req, res) => {
  const { attendanceId, clockIn, clockOut, status } = req.body;

  if (!attendanceId) {
    return res.status(400).json({ message: 'Attendance ID is required.' });
  }

  try {
    const record = await attendanceService.adjustAttendance(attendanceId, { clockIn, clockOut, status });
    res.json({
      message: 'Attendance record adjusted successfully.',
      record
    });
  } catch (err) {
    console.error('Adjust attendance error:', err);
    res.status(400).json({ message: err.message });
  }
};
