import express from 'express';
import { login, getMe } from '../controllers/authController.js';
import { changePassword, forgotPassword, verifyResetOtp, resetPassword } from '../controllers/passwordController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', login);
router.get('/me', verifyToken, getMe);
router.post('/change-password', verifyToken, changePassword);
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-otp', verifyResetOtp);
router.post('/reset-password', resetPassword);

export default router;
