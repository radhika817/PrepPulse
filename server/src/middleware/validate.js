/**
 * Middleware factory to validate req.body against a Zod schema.
 * Replaces req.body with parsed/sanitized data or passes validation errors
 * to the central error handler.
 */
export const validateBody = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    next(error);
  }
};

export default validateBody;
