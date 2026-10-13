import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../../middlewares/authMiddleware';
import { validateBody } from '../../middlewares/validationMiddleware';
import * as authController from './auth.controller';
import {
  emailSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  resendOtpSchema,
  resetPasswordSchema,
  verifyOtpSchema,
} from './auth.validation';

const router = Router();
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});
const generalAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});

router.post('/register', generalAuthLimiter, validateBody(registerSchema), authController.register);
router.post('/verify-otp', otpLimiter, validateBody(verifyOtpSchema), authController.verifyOtp);
router.post('/resend-otp', otpLimiter, validateBody(resendOtpSchema), authController.resendOtp);
router.post('/login', loginLimiter, validateBody(loginSchema), authController.login);
router.post('/refresh', generalAuthLimiter, validateBody(refreshSchema), authController.refresh);
router.post('/logout', generalAuthLimiter, authController.logout);
router.get('/me', requireAuth, authController.me);
router.post('/forgot-password', otpLimiter, validateBody(emailSchema), authController.forgotPassword);
router.post('/reset-password', otpLimiter, validateBody(resetPasswordSchema), authController.resetPassword);

export default router;