import express from 'express';
import { 
  getAllDesignations, 
  getDesignationById, 
  createDesignation, 
  updateDesignation, 
  deleteDesignation 
} from '../controllers/designationController.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/', verifyToken, getAllDesignations);
router.get('/:id', verifyToken, getDesignationById);
router.post('/', verifyToken, requireRole(['SuperAdmin', 'HRAdmin']), createDesignation);
router.put('/:id', verifyToken, requireRole(['SuperAdmin', 'HRAdmin']), updateDesignation);
router.delete('/:id', verifyToken, requireRole(['SuperAdmin', 'HRAdmin']), deleteDesignation);

export default router;
