import { employeeService } from '../services/employeeService.js';

// Get all employees (Admin only)
export const getAllEmployees = async (req, res) => {
  try {
    const employees = await employeeService.getAllEmployees();
    res.json(employees);
  } catch (err) {
    console.error('Get All Employees Controller Error: ', err);
    res.status(500).json({ message: 'An internal server error occurred.' });
  }
};

// Get single employee details
export const getEmployeeById = async (req, res) => {
  const id = parseInt(req.params.id, 10);

  // RBAC check: Employees can only view their own profile, Admins can view anyone
  if (req.user.role !== 'admin' && req.user.id !== id) {
    return res.status(403).json({ message: 'Access forbidden: Insufficient permissions.' });
  }

  try {
    const employee = await employeeService.getEmployeeById(id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found.' });
    }
    res.json(employee);
  } catch (err) {
    console.error('Get Employee Controller Error: ', err);
    res.status(500).json({ message: 'An internal server error occurred.' });
  }
};

// Create new employee (Admin only)
export const createEmployee = async (req, res) => {
  try {
    const employeeId = await employeeService.createEmployee(req.body);
    res.status(201).json({
      message: 'Employee created successfully.',
      employeeId
    });
  } catch (err) {
    console.error('Create Employee Controller Error: ', err);
    const msg = err.message;
    if (msg.includes('already exists')) {
      return res.status(409).json({ message: msg });
    }
    if (msg.includes('required') || msg.includes('Invalid') || msg.includes('must be')) {
      return res.status(400).json({ message: msg });
    }
    res.status(500).json({ message: 'An internal server error occurred.' });
  }
};

// Update employee info (Admin, or Employee editing their own data)
export const updateEmployee = async (req, res) => {
  const id = parseInt(req.params.id, 10);

  // RBAC check: Employees can only edit their own profile, Admins can edit anyone
  if (req.user.role !== 'admin' && req.user.id !== id) {
    return res.status(403).json({ message: 'Access forbidden: Insufficient permissions.' });
  }

  try {
    await employeeService.updateEmployee(id, req.body, req.user.role);
    res.json({ message: 'Employee updated successfully.' });
  } catch (err) {
    console.error('Update Employee Controller Error: ', err);
    const msg = err.message;
    if (msg.includes('not found')) {
      return res.status(404).json({ message: msg });
    }
    if (msg.includes('already exists')) {
      return res.status(409).json({ message: msg });
    }
    if (msg.includes('Invalid') || msg.includes('cannot be empty') || msg.includes('required')) {
      return res.status(400).json({ message: msg });
    }
    res.status(500).json({ message: 'An internal server error occurred.' });
  }
};

// Delete employee (Admin only)
export const deleteEmployee = async (req, res) => {
  const id = parseInt(req.params.id, 10);

  try {
    await employeeService.deleteEmployee(id);
    res.json({ message: 'Employee deleted successfully.' });
  } catch (err) {
    console.error('Delete Employee Controller Error: ', err);
    const msg = err.message;
    if (msg.includes('not found')) {
      return res.status(404).json({ message: msg });
    }
    res.status(500).json({ message: 'An internal server error occurred.' });
  }
};
