/**
 * Date and timezone utility functions for PrepPulse.
 * Formats calendar dates ("YYYY-MM-DD") in the user's IANA time zone
 * using the built-in ECMAScript Intl API with zero external dependencies.
 */

export const DEFAULT_TIMEZONE = 'Asia/Kolkata';

/**
 * Validates whether a timezone string is a valid IANA timezone name.
 * Falls back to 'Asia/Kolkata' if missing or invalid.
 *
 * @param {string} [timezone] - The IANA timezone identifier (e.g. "Asia/Kolkata", "America/New_York")
 * @returns {string} Validated IANA timezone
 */
export const sanitizeTimezone = (timezone) => {
  if (!timezone || typeof timezone !== 'string') {
    return DEFAULT_TIMEZONE;
  }
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return timezone;
  } catch (_err) {
    return DEFAULT_TIMEZONE;
  }
};

/**
 * Returns "YYYY-MM-DD" for the current moment (or a given Date) in the given IANA timezone.
 *
 * @param {string} [timezone] - IANA timezone identifier (default: "Asia/Kolkata")
 * @param {Date|number|string} [date] - Base timestamp (default: current moment)
 * @returns {string} Calendar date string formatted as "YYYY-MM-DD"
 */
export const getTodayKey = (timezone, date = new Date()) => {
  const validTz = sanitizeTimezone(timezone);
  const targetDate = date instanceof Date ? date : new Date(date);

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: validTz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(targetDate);
  const year = parts.find((p) => p.type === 'year').value;
  const month = parts.find((p) => p.type === 'month').value;
  const day = parts.find((p) => p.type === 'day').value;

  return `${year}-${month}-${day}`;
};

/**
 * Returns "YYYY-MM-DD" for the calendar day immediately preceding the given moment
 * in the given IANA timezone.
 *
 * @param {string} [timezone] - IANA timezone identifier (default: "Asia/Kolkata")
 * @param {Date|number|string} [date] - Base timestamp (default: current moment)
 * @returns {string} Calendar date string formatted as "YYYY-MM-DD"
 */
export const getYesterdayKey = (timezone, date = new Date()) => {
  const todayStr = getTodayKey(timezone, date);
  const [year, month, day] = todayStr.split('-').map(Number);

  // Month in Date.UTC is 0-indexed; subtracting 1 day handles month and year rollovers
  const yesterdayUtc = new Date(Date.UTC(year, month - 1, day - 1));
  const prevYear = yesterdayUtc.getUTCFullYear();
  const prevMonth = String(yesterdayUtc.getUTCMonth() + 1).padStart(2, '0');
  const prevDay = String(yesterdayUtc.getUTCDate()).padStart(2, '0');

  return `${prevYear}-${prevMonth}-${prevDay}`;
};

export default {
  DEFAULT_TIMEZONE,
  sanitizeTimezone,
  getTodayKey,
  getYesterdayKey,
};
