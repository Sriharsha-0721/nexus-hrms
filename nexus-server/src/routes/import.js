import express from 'express';
import multer from 'multer';
import { importEmployees } from '../controllers/importController.js';
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
    // Only allow CSV files
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are supported.'), false);
    }
  }
});

// CSV Import route (Admin only)
router.post('/employees', verifyToken, requireRole(['admin']), upload.single('file'), importEmployees);

export default router;
