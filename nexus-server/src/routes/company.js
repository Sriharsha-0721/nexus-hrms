import express from 'express';
import { 
  getCompanySettings, 
  updateCompanySettings 
} from '../controllers/companyController.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/', verifyToken, getCompanySettings);
router.put('/', verifyToken, requireRole(['SuperAdmin', 'HRAdmin', 'PayrollAdmin']), updateCompanySettings);

export default router;
