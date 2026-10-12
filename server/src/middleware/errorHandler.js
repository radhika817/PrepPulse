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

  // Handle standard HTTP status errors
  const statusCode = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);
  const errorCode = err.code || (statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_SERVER_ERROR');
  const message = err.message || 'An unexpected error occurred on the server';

  return res.status(statusCode).json({
    error: {
      code: errorCode,
      message,
    },
  });
};

export default errorHandler;
