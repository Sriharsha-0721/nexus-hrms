import express from 'express';
import { login, getMe } from '../controllers/authController.js';
import { changePassword, forgotPassword, verifyResetOtp, resetPassword } from '../controllers/passwordController.js';
import { verifyToken } from '../middleware/auth.js';

import rateLimit from 'express-rate-limit';

const router = express.Router();

// 15 minutes window, max 20 login attempts per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: 'Too many login attempts from this IP. Please try again after 15 minutes.' }
});

// 15 minutes window, max 10 password reset attempts per IP
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many password reset requests. Please try again after 15 minutes.' }
});

router.post('/login', loginLimiter, login);
router.get('/me', verifyToken, getMe);
router.post('/change-password', verifyToken, changePassword);
router.post('/forgot-password', passwordResetLimiter, forgotPassword);
router.post('/verify-reset-otp', passwordResetLimiter, verifyResetOtp);
router.post('/reset-password', passwordResetLimiter, resetPassword);

export default router;
