import type { NextFunction, Request, Response } from 'express';

export const errorHandler = (err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err?.stack || err);

  const status =
    typeof err?.status === 'number'
      ? err.status
      : typeof err?.statusCode === 'number'
      ? err.statusCode
      : 500;

  const isJsonParseError = err instanceof SyntaxError && 'body' in err;
  const message = isJsonParseError
    ? 'Invalid JSON in request body.'
    : err?.message || 'Internal server error';

  res.status(status).json({
    status: 'error',
    message,
  });
};

