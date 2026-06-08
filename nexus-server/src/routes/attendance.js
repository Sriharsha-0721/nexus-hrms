import express from 'express';
import { 
  clockIn, 
  clockOut, 
  getLogs, 
  adjustAttendance 
} from '../controllers/attendanceController.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.post('/clock-in', verifyToken, clockIn);
router.post('/clock-out', verifyToken, clockOut);
router.get('/logs', verifyToken, getLogs);
router.put('/adjust', verifyToken, requireRole(['admin']), adjustAttendance);

export default router;
