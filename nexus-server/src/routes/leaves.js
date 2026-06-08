import express from 'express';
import { 
  applyLeave, 
  getBalances, 
  getRequests, 
  approveRejectLeave 
} from '../controllers/leaveController.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.post('/apply', verifyToken, applyLeave);
router.get('/balances', verifyToken, getBalances);
router.get('/requests', verifyToken, getRequests);
router.post('/approve', verifyToken, requireRole(['admin']), approveRejectLeave);

export default router;
