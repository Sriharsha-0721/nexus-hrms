import express from 'express';
import { 
  getAllEmployees, 
  getEmployeeById, 
  createEmployee, 
  updateEmployee, 
  deleteEmployee,
  assignEmployees,
  getAssignedEmployees,
  createAdminAccount,
  getAdminAccounts
} from '../controllers/employeeController.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get all employees (HRAdmin/SuperAdmin/PayrollAdmin)
router.get('/', verifyToken, requireRole(['SuperAdmin', 'HRAdmin', 'PayrollAdmin']), getAllEmployees);

// Admin account management (SuperAdmin only)
router.post('/admins', verifyToken, requireRole(['SuperAdmin']), createAdminAccount);
router.get('/admins', verifyToken, requireRole(['SuperAdmin']), getAdminAccounts);

// Get single employee details (Admins, or Employee viewing self)
router.get('/:id', verifyToken, getEmployeeById);

// Create new employee (HRAdmin and SuperAdmin only)
router.post('/', verifyToken, requireRole(['SuperAdmin', 'HRAdmin']), createEmployee);

// Update employee (HRAdmin, SuperAdmin, or Employee editing self)
router.put('/:id', verifyToken, updateEmployee);

// Delete/Inactivate employee (HRAdmin and SuperAdmin only)
router.delete('/:id', verifyToken, requireRole(['SuperAdmin', 'HRAdmin']), deleteEmployee);

// Mapping routes (HRAdmin and SuperAdmin only)
router.post('/assign/:adminId', verifyToken, requireRole(['SuperAdmin', 'HRAdmin']), assignEmployees);
router.get('/assigned/:adminId', verifyToken, requireRole(['SuperAdmin', 'HRAdmin']), getAssignedEmployees);

export default router;
