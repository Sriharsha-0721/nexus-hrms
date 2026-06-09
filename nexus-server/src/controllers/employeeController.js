import { employeeService } from '../services/employeeService.js';

// Get all employees (Admins only)
export const getAllEmployees = async (req, res) => {
  try {
    // If HRAdmin, filter by assigned employees (if adminId is passed or implicit)
    let adminId = req.query.adminId ? parseInt(req.query.adminId, 10) : null;
    
    // SuperAdmin and PayrollAdmin bypass mapping, HRAdmins filter by ownership mapping
    if (req.user.role === 'HRAdmin' && !adminId) {
      adminId = req.user.id;
    } else if (req.user.role === 'SuperAdmin' || req.user.role === 'PayrollAdmin') {
      adminId = null; // show all
    }

    const employees = await employeeService.getAllEmployees(adminId);
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
  const isAdmin = ['SuperAdmin', 'HRAdmin', 'PayrollAdmin'].includes(req.user.role);
  if (!isAdmin && req.user.id !== id) {
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

// Create new employee (SuperAdmin/HRAdmin only)
export const createEmployee = async (req, res) => {
  try {
    const employeeId = await employeeService.createEmployee(req.body, req.user.id);
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

// Update employee info (SuperAdmin, HRAdmin, or Employee editing their own data)
export const updateEmployee = async (req, res) => {
  const id = parseInt(req.params.id, 10);

  // RBAC check: Employees can edit their own profile, SuperAdmin & HRAdmin can edit anyone
  const isHR = ['SuperAdmin', 'HRAdmin'].includes(req.user.role);
  if (!isHR && req.user.id !== id) {
    return res.status(403).json({ message: 'Access forbidden: Insufficient permissions.' });
  }

  try {
    await employeeService.updateEmployee(id, req.body, req.user.role, req.user.id);
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

// Delete employee (SuperAdmin/HRAdmin only)
export const deleteEmployee = async (req, res) => {
  const id = parseInt(req.params.id, 10);

  try {
    await employeeService.deleteEmployee(id, req.user.id);
    res.json({ message: 'Employee deleted/inactivated successfully.' });
  } catch (err) {
    console.error('Delete Employee Controller Error: ', err);
    const msg = err.message;
    if (msg.includes('not found')) {
      return res.status(404).json({ message: msg });
    }
    res.status(500).json({ message: 'An internal server error occurred.' });
  }
};

// Assign employees to an admin (HRAdmin/SuperAdmin only)
export const assignEmployees = async (req, res) => {
  try {
    const adminId = parseInt(req.params.adminId, 10);
    const { employeeIds } = req.body;
    await employeeService.assignEmployeesToAdmin(adminId, employeeIds, req.user.id);
    res.json({ message: 'Employees assigned successfully.' });
  } catch (err) {
    console.error('Assign Employees Controller Error: ', err);
    res.status(400).json({ message: err.message });
  }
};

// Get employees assigned to an admin (HRAdmin/SuperAdmin only)
export const getAssignedEmployees = async (req, res) => {
  try {
    const adminId = parseInt(req.params.adminId, 10);
    const employeeIds = await employeeService.getAssignedEmployeesForAdmin(adminId);
    res.json(employeeIds);
  } catch (err) {
    console.error('Get Assigned Employees Controller Error: ', err);
    res.status(500).json({ message: 'An internal server error occurred.' });
  }
};

// Create admin login account (SuperAdmin only)
export const createAdminAccount = async (req, res) => {
  try {
    const adminId = await employeeService.createAdminAccount(req.body, req.user.id);
    res.status(201).json({
      message: 'Admin account created successfully.',
      adminId
    });
  } catch (err) {
    console.error('Create Admin Controller Error: ', err);
    res.status(400).json({ message: err.message });
  }
};

// Get all admin login accounts (SuperAdmin only)
export const getAdminAccounts = async (req, res) => {
  try {
    const admins = await employeeService.getAdminAccounts();
    res.json(admins);
  } catch (err) {
    console.error('Get Admin Accounts Controller Error: ', err);
    res.status(500).json({ message: 'An internal server error occurred.' });
  }
};
