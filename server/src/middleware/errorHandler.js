import { ZodError } from 'zod';

/**
 * Central error handling middleware.
 * Formats all errors as `{ error: { code, message } }`
 * matching SYSTEM_DESIGN.md section 4.
 */
export const errorHandler = (err, req, res, _next) => {
  if (process.env.NODE_ENV !== 'test') {
    console.error(`[Error] ${req.method} ${req.originalUrl}:`, err.message || err);
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: formattedErrors,
      },
    });
  }

  // Handle Mongoose CastError (e.g. invalid ObjectId format)
  if (err.name === 'CastError') {
    return res.status(400).json({
      error: {
        code: 'INVALID_ID',
        message: `Invalid format for field: ${err.path}`,
      },
    });
  }

  // Handle Mongoose duplicate key error (E11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({
      error: {
        code: 'DUPLICATE_KEY',
        message: `An entry with this ${field} already exists`,
      },
    });
  }

  const isProduction = process.env.NODE_ENV === 'production';

  // Handle standard HTTP status errors
  const statusCode =
    typeof err.statusCode === 'number' && err.statusCode >= 400 && err.statusCode < 600
      ? err.statusCode
      : res.statusCode >= 400
      ? res.statusCode
      : 500;

  const errorCode =
    typeof err.code === 'string'
      ? err.code
      : statusCode === 404
      ? 'NOT_FOUND'
      : statusCode === 400
      ? 'BAD_REQUEST'
      : statusCode === 401
      ? 'UNAUTHORIZED'
      : statusCode === 403
      ? 'FORBIDDEN'
      : 'INTERNAL_SERVER_ERROR';

  // In production, never leak internal error messages or database details for 5xx errors
  let message;
  if (statusCode >= 500) {
    message = isProduction
      ? 'An unexpected error occurred on the server'
      : err.message || 'An unexpected error occurred on the server';
  } else {
    message = err.message || 'Request failed';
  }

  const responsePayload = {
    error: {
      code: errorCode,
      message,
    },
  };

  // Stack traces are strictly excluded in production and tests
  if (!isProduction && process.env.NODE_ENV !== 'test' && err.stack) {
    responsePayload.error.stack = err.stack;
  }

  return res.status(statusCode).json(responsePayload);
};

export default errorHandler;
