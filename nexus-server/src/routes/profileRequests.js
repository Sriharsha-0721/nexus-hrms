import express from 'express';
import { 
  submitRequest, 
  getPendingRequests, 
  getAllRequests,
  processRequest 
} from '../controllers/profileRequestController.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Employees can submit requests
router.post('/', verifyToken, submitRequest);

// Admins can manage requests
router.get('/pending', verifyToken, requireRole(['SuperAdmin', 'HRAdmin']), getPendingRequests);
router.get('/all', verifyToken, requireRole(['SuperAdmin', 'HRAdmin']), getAllRequests);
router.post('/:id/process', verifyToken, requireRole(['SuperAdmin', 'HRAdmin']), processRequest);

export default router;
