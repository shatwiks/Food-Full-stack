/**
 * CORS Configuration & Allowed Origin Evaluator
 * Supports Vercel production/preview deployments, local development, and custom CORS_ORIGIN
 */

export const DEFAULT_ALLOWED_ORIGINS: string[] = [
  'https://food-full-stack-kappa.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
];

export const isOriginAllowed = (origin: string | undefined): boolean => {
  // Allow requests with no origin (curl, Postman, mobile apps, server-to-server)
  if (!origin) {
    return true;
  }

  const envOrigins = (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const allowedList = [...DEFAULT_ALLOWED_ORIGINS, ...envOrigins];

  // Direct match or wildcard in configuration
  if (allowedList.includes(origin) || allowedList.includes('*')) {
    return true;
  }

  // Any localhost or 127.0.0.1 on any port
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    return true;
  }

  // Any Vercel deployment preview or production domain (*.vercel.app)
  if (/^https:\/\/([a-zA-Z0-9_-]+\.)?vercel\.app$/.test(origin)) {
    return true;
  }

  // Render domains (*.onrender.com)
  if (/^https:\/\/([a-zA-Z0-9_-]+\.)?onrender\.com$/.test(origin)) {
    return true;
  }

  return false;
};
