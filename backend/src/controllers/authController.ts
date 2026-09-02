import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { send2FAEmail } from '../utils/mailer.js';

const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email is invalid.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  firstName: z.string().trim().optional(),
  lastName: z.string().trim().optional(),
  role: z.enum(['CUSTOMER', 'RESTAURANT_OWNER', 'ADMIN']).optional().default('CUSTOMER'),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email is invalid.'),
  password: z.string().min(1, 'Password is required.'),
});

const verify2FASchema = z.object({
  preAuthToken: z.string().min(1, 'preAuthToken is required.'),
  code: z.string().trim().length(6, 'Verification code must be exactly 6 digits.'),
});

const resend2FASchema = z.object({
  preAuthToken: z.string().min(1, 'preAuthToken is required.'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required.'),
});

const userSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const;

const signAccessToken = (user: { id: string; email: string; role: string }) => {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    throw new Error('JWT_ACCESS_SECRET is not configured.');
  }
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, secret, { expiresIn: '15m' });
};

const signRefreshToken = (user: { id: string; email: string; role: string }) => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET is not configured.');
  }
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, secret, { expiresIn: '7d' });
};

const signPreAuthToken = (userId: string) => {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    throw new Error('JWT_ACCESS_SECRET is not configured.');
  }
  return jwt.sign({ sub: userId, stage: 'AWAITING_2FA' }, secret, { expiresIn: '5m' });
};

const verifyPreAuthToken = (token: string): { userId: string } | null => {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    throw new Error('JWT_ACCESS_SECRET is not configured.');
  }
  try {
    const decoded = jwt.verify(token, secret) as { sub?: string; stage?: string };
    if (!decoded.sub || decoded.stage !== 'AWAITING_2FA') {
      return null;
    }
    return { userId: decoded.sub };
  } catch {
    return null;
  }
};

const sanitizeUser = <T extends { password?: string | null }>(user: T) => {
  const { password: _password, ...safeUser } = user;
  return safeUser;
};

const storeRefreshToken = async (userId: string, rawToken: string) => {
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
  const tokenHash = await bcrypt.hash(rawToken, 10);

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });
};

const revokeRefreshToken = async (normalizedToken: string) => {
  let userId: string | undefined;
  try {
    const decoded = jwt.decode(normalizedToken) as { sub?: string } | null;
    userId = decoded?.sub;
  } catch {
    // ignore
  }

  const where = {
    revokedAt: null,
    expiresAt: { gt: new Date() },
    ...(userId ? { userId } : {}),
  };

  const refreshTokens = await prisma.refreshToken.findMany({
    where,
    select: { id: true, tokenHash: true },
  });

  for (const refreshToken of refreshTokens) {
    const isMatch = await bcrypt.compare(normalizedToken, refreshToken.tokenHash);

    if (isMatch) {
      await prisma.refreshToken.delete({ where: { id: refreshToken.id } });
      return;
    }
  }
};

export const register = async (req: Request, res: Response) => {
  try {
    const parsed = registerSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ status: 'error', message: parsed.error.issues[0]?.message ?? 'Invalid request body.' });
      return;
    }

    const { email, password, firstName, lastName, role } = parsed.data;

    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      res.status(409).json({ status: 'error', message: 'An account with this email already exists.' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role,
      },
      select: userSelect,
    });

    const accessToken = signAccessToken({ id: user.id, email: user.email, role: user.role });
    const refreshToken = signRefreshToken({ id: user.id, email: user.email, role: user.role });

    await storeRefreshToken(user.id, refreshToken);

    res.status(201).json({
      status: 'success',
      message: 'User registered successfully.',
      user,
      tokens: {
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ status: 'error', message: 'Unable to register user.' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const parsed = loginSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ status: 'error', message: parsed.error.issues[0]?.message ?? 'Invalid request body.' });
      return;
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
      },
    });

    if (!user) {
      res.status(401).json({ status: 'error', message: 'Invalid email or password.' });
      return;
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      res.status(401).json({ status: 'error', message: 'Invalid email or password.' });
      return;
    }

    // Invalidate any existing LOGIN_2FA OTP records for this user
    await prisma.otp.deleteMany({
      where: {
        userId: user.id,
        type: 'LOGIN_2FA',
      },
    });

    // Generate a secure 6-digit random code
    const rawCode = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = await bcrypt.hash(rawCode, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes validity

    await prisma.otp.create({
      data: {
        userId: user.id,
        codeHash,
        type: 'LOGIN_2FA',
        expiresAt,
        attempts: 0,
      },
    });

    const preAuthToken = signPreAuthToken(user.id);

    // Send email delivery asynchronously or await
    await send2FAEmail(user.email, rawCode);

    res.status(200).json({
      status: 'success',
      message: 'Credentials verified. 2FA verification code sent to your email.',
      requires2FA: true,
      preAuthToken,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ status: 'error', message: 'Unable to log in.' });
  }
};

export const verify2FA = async (req: Request, res: Response) => {
  try {
    const parsed = verify2FASchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ status: 'error', message: parsed.error.issues[0]?.message ?? 'Invalid request body.' });
      return;
    }

    const { preAuthToken, code } = parsed.data;

    const preAuth = verifyPreAuthToken(preAuthToken);
    if (!preAuth) {
      res.status(401).json({ status: 'error', message: 'Pre-auth token is invalid or expired. Please log in again.' });
      return;
    }

    const otp = await prisma.otp.findFirst({
      where: {
        userId: preAuth.userId,
        type: 'LOGIN_2FA',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!otp) {
      res.status(400).json({ status: 'error', message: 'No active OTP found. Please request a new code.' });
      return;
    }

    if (new Date() > otp.expiresAt) {
      await prisma.otp.delete({ where: { id: otp.id } });
      res.status(400).json({ status: 'error', message: 'Verification code has expired. Please request a new code.' });
      return;
    }

    if (otp.attempts >= 3) {
      await prisma.otp.delete({ where: { id: otp.id } });
      res.status(429).json({ status: 'error', message: 'Maximum attempts exceeded. Please log in again.' });
      return;
    }

    const isMatch = await bcrypt.compare(code, otp.codeHash);

    if (!isMatch) {
      const updatedOtp = await prisma.otp.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });

      const remainingAttempts = Math.max(0, 3 - updatedOtp.attempts);

      if (remainingAttempts === 0) {
        await prisma.otp.delete({ where: { id: otp.id } });
        res.status(429).json({ status: 'error', message: 'Maximum attempts exceeded. Please log in again.' });
        return;
      }

      res.status(400).json({
        status: 'error',
        message: `Invalid verification code. ${remainingAttempts} attempt(s) remaining.`,
      });
      return;
    }

    // Success - burn OTP
    await prisma.otp.delete({ where: { id: otp.id } });

    const user = await prisma.user.findUnique({
      where: { id: preAuth.userId },
      select: userSelect,
    });

    if (!user) {
      res.status(404).json({ status: 'error', message: 'User not found.' });
      return;
    }

    const accessToken = signAccessToken({ id: user.id, email: user.email, role: user.role });
    const refreshToken = signRefreshToken({ id: user.id, email: user.email, role: user.role });

    await storeRefreshToken(user.id, refreshToken);

    res.status(200).json({
      status: 'success',
      message: '2FA verification successful.',
      user,
      tokens: {
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error('verify2FA error:', error);
    res.status(500).json({ status: 'error', message: 'Unable to verify code.' });
  }
};

export const resend2FA = async (req: Request, res: Response) => {
  try {
    const parsed = resend2FASchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ status: 'error', message: parsed.error.issues[0]?.message ?? 'Invalid request body.' });
      return;
    }

    const { preAuthToken } = parsed.data;

    const preAuth = verifyPreAuthToken(preAuthToken);
    if (!preAuth) {
      res.status(401).json({ status: 'error', message: 'Pre-auth token is invalid or expired. Please log in again.' });
      return;
    }

    const latestOtp = await prisma.otp.findFirst({
      where: {
        userId: preAuth.userId,
        type: 'LOGIN_2FA',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (latestOtp) {
      const elapsedMs = Date.now() - new Date(latestOtp.createdAt).getTime();
      if (elapsedMs < 60 * 1000) {
        const waitSec = Math.ceil((60 * 1000 - elapsedMs) / 1000);
        res.status(429).json({
          status: 'error',
          message: `Please wait ${waitSec}s before requesting a new code.`,
        });
        return;
      }
    }

    const user = await prisma.user.findUnique({
      where: { id: preAuth.userId },
      select: { id: true, email: true },
    });

    if (!user) {
      res.status(404).json({ status: 'error', message: 'User not found.' });
      return;
    }

    // Invalidate previous OTPs
    await prisma.otp.deleteMany({
      where: {
        userId: user.id,
        type: 'LOGIN_2FA',
      },
    });

    // Generate new OTP
    const rawCode = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = await bcrypt.hash(rawCode, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await prisma.otp.create({
      data: {
        userId: user.id,
        codeHash,
        type: 'LOGIN_2FA',
        expiresAt,
        attempts: 0,
      },
    });

    await send2FAEmail(user.email, rawCode);

    res.status(200).json({
      status: 'success',
      message: 'A new 2FA verification code has been sent.',
    });
  } catch (error) {
    console.error('resend2FA error:', error);
    res.status(500).json({ status: 'error', message: 'Unable to resend verification code.' });
  }
};

export const refresh = async (req: Request, res: Response) => {
  try {
    const parsed = refreshSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ status: 'error', message: parsed.error.issues[0]?.message ?? 'Invalid request body.' });
      return;
    }

    const { refreshToken } = parsed.data;
    const secret = process.env.JWT_REFRESH_SECRET;

    if (!secret) {
      res.status(500).json({ status: 'error', message: 'JWT_REFRESH_SECRET is not configured.' });
      return;
    }

    const payload = jwt.verify(refreshToken, secret) as { sub: string; email: string; role: string };

    const storedTokens = await prisma.refreshToken.findMany({
      where: { userId: payload.sub, expiresAt: { gt: new Date() } },
      select: { id: true, tokenHash: true },
    });

    let matchedToken = false;

    for (const storedToken of storedTokens) {
      const isMatch = await bcrypt.compare(refreshToken, storedToken.tokenHash);

      if (isMatch) {
        matchedToken = true;
        await prisma.refreshToken.delete({ where: { id: storedToken.id } });
        break;
      }
    }

    if (!matchedToken) {
      res.status(401).json({ status: 'error', message: 'Refresh token is invalid or expired.' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: userSelect,
    });

    if (!user) {
      res.status(401).json({ status: 'error', message: 'User no longer exists.' });
      return;
    }

    const newAccessToken = signAccessToken({ id: user.id, email: user.email, role: user.role });
    const newRefreshToken = signRefreshToken({ id: user.id, email: user.email, role: user.role });

    await storeRefreshToken(user.id, newRefreshToken);

    res.status(200).json({
      status: 'success',
      message: 'Token refreshed successfully.',
      user,
      tokens: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (_error) {
    res.status(401).json({ status: 'error', message: 'Refresh token is invalid or expired.' });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const refreshToken = typeof req.body?.refreshToken === 'string' ? req.body.refreshToken : null;

    if (!refreshToken) {
      res.status(400).json({ status: 'error', message: 'Refresh token is required.' });
      return;
    }

    await revokeRefreshToken(refreshToken);

    res.status(200).json({ status: 'success', message: 'Logged out successfully.' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ status: 'error', message: 'Unable to log out.' });
  }
};

export const me = async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ status: 'error', message: 'Authentication required.' });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: userSelect,
  });

  if (!user) {
    res.status(404).json({ status: 'error', message: 'User not found.' });
    return;
  }

  res.status(200).json({ status: 'success', user });
};