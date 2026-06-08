import express from 'express';
import { 
  getAllEmployees, 
  getEmployeeById, 
  createEmployee, 
  updateEmployee, 
  deleteEmployee 
} from '../controllers/employeeController.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get all employees (Admin only)
router.get('/', verifyToken, requireRole(['admin']), getAllEmployees);

// Get single employee details (Admin, or Employee viewing self)
router.get('/:id', verifyToken, getEmployeeById);

// Create new employee (Admin only)
router.post('/', verifyToken, requireRole(['admin']), createEmployee);

// Update employee (Admin, or Employee editing self)
router.put('/:id', verifyToken, updateEmployee);

// Delete employee (Admin only)
router.delete('/:id', verifyToken, requireRole(['admin']), deleteEmployee);

export default router;
