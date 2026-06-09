import { designationService } from '../services/designationService.js';

export const getAllDesignations = async (req, res) => {
  try {
    const designations = await designationService.getAllDesignations();
    res.json(designations);
  } catch (err) {
    console.error('Get All Designations Error: ', err);
    res.status(500).json({ message: err.message || 'An internal server error occurred.' });
  }
};

export const getDesignationById = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const designation = await designationService.getDesignationById(id);
    if (!designation) return res.status(404).json({ message: 'Designation not found.' });
    res.json(designation);
  } catch (err) {
    console.error('Get Designation By ID Error: ', err);
    res.status(500).json({ message: err.message || 'An internal server error occurred.' });
  }
};

export const createDesignation = async (req, res) => {
  try {
    const designationId = await designationService.createDesignation(req.body);
    res.status(201).json({ message: 'Designation created successfully.', designationId });
  } catch (err) {
    console.error('Create Designation Error: ', err);
    res.status(err.message.includes('already exists') ? 409 : 400).json({ message: err.message });
  }
};

export const updateDesignation = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await designationService.updateDesignation(id, req.body);
    res.json({ message: 'Designation updated successfully.' });
  } catch (err) {
    console.error('Update Designation Error: ', err);
    res.status(err.message.includes('not found') ? 404 : err.message.includes('already exists') ? 409 : 400).json({ message: err.message });
  }
};

export const deleteDesignation = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await designationService.deleteDesignation(id);
    res.json({ message: 'Designation deleted successfully.' });
  } catch (err) {
    console.error('Delete Designation Error: ', err);
    res.status(err.message.includes('not found') ? 404 : 400).json({ message: err.message });
  }
};
