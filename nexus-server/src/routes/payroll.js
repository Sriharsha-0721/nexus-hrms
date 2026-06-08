import express from 'express';
import { 
  runPayroll, 
  getHistory, 
  getPayslip, 
  updatePaymentStatus 
} from '../controllers/payrollController.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.post('/run', verifyToken, requireRole(['admin']), runPayroll);
router.get('/history', verifyToken, getHistory);
router.get('/payslip/:id', verifyToken, getPayslip);
router.put('/status/:id', verifyToken, requireRole(['admin']), updatePaymentStatus);

export default router;
