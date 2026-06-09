import { departmentService } from '../services/departmentService.js';

export const getAllDepartments = async (req, res) => {
  try {
    const departments = await departmentService.getAllDepartments();
    res.json(departments);
  } catch (err) {
    console.error('Get All Departments Error: ', err);
    res.status(500).json({ message: err.message || 'An internal server error occurred.' });
  }
};

export const getDepartmentById = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const department = await departmentService.getDepartmentById(id);
    if (!department) return res.status(404).json({ message: 'Department not found.' });
    res.json(department);
  } catch (err) {
    console.error('Get Department By ID Error: ', err);
    res.status(500).json({ message: err.message || 'An internal server error occurred.' });
  }
};

export const createDepartment = async (req, res) => {
  try {
    const departmentId = await departmentService.createDepartment(req.body);
    res.status(201).json({ message: 'Department created successfully.', departmentId });
  } catch (err) {
    console.error('Create Department Error: ', err);
    res.status(err.message.includes('already exists') ? 409 : 400).json({ message: err.message });
  }
};

export const updateDepartment = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await departmentService.updateDepartment(id, req.body);
    res.json({ message: 'Department updated successfully.' });
  } catch (err) {
    console.error('Update Department Error: ', err);
    res.status(err.message.includes('not found') ? 404 : err.message.includes('already exists') ? 409 : 400).json({ message: err.message });
  }
};

export const deleteDepartment = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await departmentService.deleteDepartment(id);
    res.json({ message: 'Department deleted successfully.' });
  } catch (err) {
    console.error('Delete Department Error: ', err);
    res.status(err.message.includes('not found') ? 404 : 400).json({ message: err.message });
  }
};
