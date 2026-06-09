import { profileRequestService } from '../services/profileRequestService.js';

export const submitRequest = async (req, res) => {
  try {
    const empId = req.user.id;
    const requestId = await profileRequestService.createRequest(empId, req.body);
    res.status(201).json({ message: 'Profile change request submitted successfully.', requestId });
  } catch (err) {
    console.error('Submit Profile Request Error: ', err);
    res.status(400).json({ message: err.message || 'Failed to submit profile change request.' });
  }
};

export const getPendingRequests = async (req, res) => {
  try {
    const requests = await profileRequestService.getPendingRequests();
    res.json(requests);
  } catch (err) {
    console.error('Get Pending Requests Error: ', err);
    res.status(500).json({ message: 'An internal server error occurred.' });
  }
};

export const getAllRequests = async (req, res) => {
  try {
    const requests = await profileRequestService.getAllRequests();
    res.json(requests);
  } catch (err) {
    console.error('Get All Requests Error: ', err);
    res.status(500).json({ message: 'An internal server error occurred.' });
  }
};

export const processRequest = async (req, res) => {
  try {
    const requestId = parseInt(req.params.id, 10);
    const { status, reason } = req.body;
    const adminEmpId = req.user.id;

    await profileRequestService.processRequest(requestId, status, reason, adminEmpId);
    res.json({ message: `Request has been ${status.toLowerCase()} successfully.` });
  } catch (err) {
    console.error('Process Request Error: ', err);
    res.status(err.message.includes('not found') ? 404 : 400).json({ message: err.message });
  }
};
