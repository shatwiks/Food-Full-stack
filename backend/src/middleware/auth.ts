import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';

type AuthTokenPayload = {
  sub: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
};

const getTokenFromAuthHeader = (req: Request) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.replace('Bearer ', '').trim();
};

const authenticateToken = async (req: Request, res: Response, next: NextFunction, secretName: 'JWT_ACCESS_SECRET' | 'JWT_REFRESH_SECRET') => {
  const token = getTokenFromAuthHeader(req);

  if (!token) {
    res.status(401).json({ status: 'error', message: 'Authentication token is required.' });
    return;
  }

  const secret = process.env[secretName] || process.env.JWT_SECRET || (secretName === 'JWT_ACCESS_SECRET' ? 'orderflow-access-dev-secret' : 'orderflow-refresh-dev-secret');

  try {
    const payload = jwt.verify(token, secret) as AuthTokenPayload;

    if (!payload.sub) {
      res.status(401).json({ status: 'error', message: 'Token payload is invalid.' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!user) {
      res.status(401).json({ status: 'error', message: 'User no longer exists.' });
      return;
    }

    req.user = user;
    next();
  } catch (_error) {
    res.status(401).json({ status: 'error', message: 'Invalid or expired token.' });
  }
};

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  await authenticateToken(req, res, next, 'JWT_ACCESS_SECRET');
};

export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required.' });
      return;
    }

    const allowedRoles = roles.length === 1 && roles[0].includes(',') ? roles[0].split(',') : roles;

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ status: 'error', message: 'You do not have permission to access this resource.' });
      return;
    }

    next();
  };
};