import express from 'express';
import { exportData } from '../controllers/exportController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// CSV Export route
// RBAC checks are handled dynamically inside exportData based on the :type param
router.get('/:type', verifyToken, exportData);

export default router;
