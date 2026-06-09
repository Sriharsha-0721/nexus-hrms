import express from 'express';
import { 
  applyLeave, 
  getBalances, 
  getRequests, 
  approveRejectLeave,
  getPolicies,
  updatePolicy
} from '../controllers/leaveController.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.post('/apply', verifyToken, applyLeave);
router.get('/balances', verifyToken, getBalances);
router.get('/requests', verifyToken, getRequests);
router.post('/approve', verifyToken, requireRole(['SuperAdmin', 'HRAdmin']), approveRejectLeave);
router.get('/policies', verifyToken, getPolicies);
router.put('/policies/:id', verifyToken, requireRole(['SuperAdmin', 'HRAdmin']), updatePolicy);

export default router;
