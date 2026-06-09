import express from 'express';
import { 
  getAllDepartments, 
  getDepartmentById, 
  createDepartment, 
  updateDepartment, 
  deleteDepartment 
} from '../controllers/departmentController.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/', verifyToken, getAllDepartments);
router.get('/:id', verifyToken, getDepartmentById);
router.post('/', verifyToken, requireRole(['SuperAdmin', 'HRAdmin']), createDepartment);
router.put('/:id', verifyToken, requireRole(['SuperAdmin', 'HRAdmin']), updateDepartment);
router.delete('/:id', verifyToken, requireRole(['SuperAdmin', 'HRAdmin']), deleteDepartment);

export default router;
