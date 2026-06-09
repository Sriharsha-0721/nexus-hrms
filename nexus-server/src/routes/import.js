import express from 'express';
import multer from 'multer';
import { importData, getImportLogs } from '../controllers/importController.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Configure Multer for in-memory file buffers
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are supported.'), false);
    }
  }
});

// Import history logs (Admin only)
router.get('/logs', verifyToken, requireRole(['SuperAdmin', 'HRAdmin', 'PayrollAdmin']), getImportLogs);

// Dynamic CSV Import route (verifyToken first so req.user is set, upload file, and then process in importData)
router.post('/:type', verifyToken, upload.single('file'), importData);

export default router;
