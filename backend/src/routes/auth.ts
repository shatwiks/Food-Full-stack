import { Router } from 'express';
import {
  login,
  logout,
  me,
  refresh,
  register,
  resend2FA,
  verify2FA,
} from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';

export const authRouter = Router();

authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.post('/verify-2fa', verify2FA);
authRouter.post('/resend-2fa', resend2FA);
authRouter.post('/refresh', refresh);
authRouter.post('/logout', logout);
authRouter.get('/me', requireAuth, me);