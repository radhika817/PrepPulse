import { z } from 'zod';

/**
 * Validates that a string is a recognized IANA time zone name.
 */
export const isValidIANATimeZone = (tz) => {
  if (typeof tz !== 'string' || !tz.trim()) return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

/**
 * Schema for User Registration.
 * - name: 2 to 50 characters
 * - email: valid email address
 * - password: min 8 characters, at least one letter and one number
 * - timezone: optional valid IANA timezone (defaults to Asia/Kolkata)
 * Rejects unknown fields.
 */
export const registerSchema = z
  .object({
    name: z
      .string({ required_error: 'Name is required' })
      .trim()
      .min(2, 'Name must be between 2 and 50 characters')
      .max(50, 'Name must be between 2 and 50 characters'),
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .toLowerCase()
      .email('Please provide a valid email address'),
    password: z
      .string({ required_error: 'Password is required' })
      .min(8, 'Password must be at least 8 characters long')
      .regex(
        /^(?=.*[A-Za-z])(?=.*\d)/,
        'Password must contain at least one letter and one number'
      ),
    timezone: z
      .string()
      .trim()
      .refine(isValidIANATimeZone, {
        message: 'Must be a valid IANA time zone name (e.g. Asia/Kolkata)',
      })
      .optional(),
  })
  .strict();

/**
 * Schema for User Login.
 * - email: valid email address
 * - password: string
 * Rejects unknown fields.
 */
export const loginSchema = z
  .object({
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .toLowerCase()
      .email('Please provide a valid email address'),
    password: z
      .string({ required_error: 'Password is required' })
      .min(1, 'Password is required'),
  })
  .strict();

/**
 * Schema for Updating User Profile.
 * - name: optional, 2 to 50 characters
 * - timezone: optional, valid IANA timezone
 * Rejects unknown fields (including role, email, passwordHash, streak).
 */
export const updateProfileSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Name must be between 2 and 50 characters')
      .max(50, 'Name must be between 2 and 50 characters')
      .optional(),
    timezone: z
      .string()
      .trim()
      .refine(isValidIANATimeZone, {
        message: 'Must be a valid IANA time zone name (e.g. Asia/Kolkata)',
      })
      .optional(),
  })
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    {
      message: 'At least one field (name or timezone) must be provided to update',
    }
  );
