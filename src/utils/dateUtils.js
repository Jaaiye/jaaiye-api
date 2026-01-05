/**
 * Date Utility Module
 * Standardized date/time handling for the application
 *
 * All dates are stored and compared in UTC to avoid timezone issues
 * MongoDB stores dates in UTC, so we should always work in UTC
 */

/**
 * Get current UTC date/time
 * @returns {Date} Current date in UTC
 */
function now() {
  return new Date();
}

/**
 * Get current UTC timestamp (milliseconds since epoch)
 * @returns {number} Current timestamp
 */
function nowTimestamp() {
  return Date.now();
}

/**
 * Create a date from a timestamp (ensures UTC)
 * @param {number} timestamp - Milliseconds since epoch
 * @returns {Date} Date object in UTC
 */
function fromTimestamp(timestamp) {
  return new Date(timestamp);
}

/**
 * Add time to current date
 * @param {number} milliseconds - Milliseconds to add
 * @returns {Date} New date in UTC
 */
function addToNow(milliseconds) {
  return new Date(Date.now() + milliseconds);
}

/**
 * Add time to a given date
 * @param {Date|string|number} date - Base date
 * @param {number} milliseconds - Milliseconds to add
 * @returns {Date} New date in UTC
 */
function addTime(date, milliseconds) {
  const baseDate = date instanceof Date ? date : new Date(date);
  return new Date(baseDate.getTime() + milliseconds);
}

/**
 * Add hours to current date
 * @param {number} hours - Hours to add
 * @returns {Date} New date in UTC
 */
function addHoursToNow(hours) {
  return addToNow(hours * 60 * 60 * 1000);
}

/**
 * Add minutes to current date
 * @param {number} minutes - Minutes to add
 * @returns {Date} New date in UTC
 */
function addMinutesToNow(minutes) {
  return addToNow(minutes * 60 * 1000);
}

/**
 * Add days to current date
 * @param {number} days - Days to add
 * @returns {Date} New date in UTC
 */
function addDaysToNow(days) {
  return addToNow(days * 24 * 60 * 60 * 1000);
}

/**
 * Add hours to a given date
 * @param {Date|string|number} date - Base date
 * @param {number} hours - Hours to add
 * @returns {Date} New date in UTC
 */
function addHours(date, hours) {
  return addTime(date, hours * 60 * 60 * 1000);
}

/**
 * Add minutes to a given date
 * @param {Date|string|number} date - Base date
 * @param {number} minutes - Minutes to add
 * @returns {Date} New date in UTC
 */
function addMinutes(date, minutes) {
  return addTime(date, minutes * 60 * 1000);
}

/**
 * Add days to a given date
 * @param {Date|string|number} date - Base date
 * @param {number} days - Days to add
 * @returns {Date} New date in UTC
 */
function addDays(date, days) {
  return addTime(date, days * 24 * 60 * 60 * 1000);
}

/**
 * Check if a date is expired (in the past)
 * @param {Date|string|number|null|undefined} expiresAt - Expiration date
 * @returns {boolean} True if expired or null/undefined
 */
function isExpired(expiresAt) {
  if (!expiresAt) {
    return true; // No expiry date means expired
  }
  const expiryDate = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  const now = new Date();
  return expiryDate < now;
}

/**
 * Check if a date is valid (not expired)
 * @param {Date|string|number|null|undefined} expiresAt - Expiration date
 * @returns {boolean} True if valid (not expired)
 */
function isValid(expiresAt) {
  return !isExpired(expiresAt);
}

/**
 * Compare two dates
 * @param {Date|string|number} date1 - First date
 * @param {Date|string|number} date2 - Second date
 * @returns {number} Negative if date1 < date2, 0 if equal, positive if date1 > date2
 */
function compare(date1, date2) {
  const d1 = date1 instanceof Date ? date1 : new Date(date1);
  const d2 = date2 instanceof Date ? date2 : new Date(date2);
  return d1.getTime() - d2.getTime();
}

/**
 * Check if date1 is before date2
 * @param {Date|string|number} date1 - First date
 * @param {Date|string|number} date2 - Second date
 * @returns {boolean} True if date1 < date2
 */
function isBefore(date1, date2) {
  return compare(date1, date2) < 0;
}

/**
 * Check if date1 is after date2
 * @param {Date|string|number} date1 - First date
 * @param {Date|string|number} date2 - Second date
 * @returns {boolean} True if date1 > date2
 */
function isAfter(date1, date2) {
  return compare(date1, date2) > 0;
}

/**
 * Convert date to ISO string (UTC)
 * @param {Date|string|number} date - Date to convert
 * @returns {string} ISO string representation
 */
function toISOString(date) {
  const d = date instanceof Date ? date : new Date(date);
  return d.toISOString();
}

/**
 * Parse ISO string to Date (UTC)
 * @param {string} isoString - ISO string
 * @returns {Date} Date object
 */
function fromISOString(isoString) {
  return new Date(isoString);
}

/**
 * Get time remaining until expiry in milliseconds
 * @param {Date|string|number} expiresAt - Expiration date
 * @returns {number} Milliseconds remaining (negative if expired)
 */
function getTimeRemaining(expiresAt) {
  if (!expiresAt) {
    return 0;
  }
  const expiryDate = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  return expiryDate.getTime() - Date.now();
}

/**
 * Get time remaining in minutes
 * @param {Date|string|number} expiresAt - Expiration date
 * @returns {number} Minutes remaining (negative if expired)
 */
function getMinutesRemaining(expiresAt) {
  return Math.floor(getTimeRemaining(expiresAt) / (60 * 1000));
}

/**
 * Get time remaining in hours
 * @param {Date|string|number} expiresAt - Expiration date
 * @returns {number} Hours remaining (negative if expired)
 */
function getHoursRemaining(expiresAt) {
  return Math.floor(getTimeRemaining(expiresAt) / (60 * 60 * 1000));
}

/**
 * Common expiry durations in milliseconds
 */
const DURATIONS = {
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  MONTH: 30 * 24 * 60 * 60 * 1000, // Approximate
  YEAR: 365 * 24 * 60 * 60 * 1000 // Approximate
};

module.exports = {
  // Current time
  now,
  nowTimestamp,

  // Date creation
  fromTimestamp,
  fromISOString,

  // Adding time to now
  addToNow,
  addHoursToNow,
  addMinutesToNow,
  addDaysToNow,

  // Adding time to a date
  addTime,
  addHours,
  addMinutes,
  addDays,

  // Comparison
  isExpired,
  isValid,
  compare,
  isBefore,
  isAfter,

  // Conversion
  toISOString,

  // Time remaining
  getTimeRemaining,
  getMinutesRemaining,
  getHoursRemaining,

  // Constants
  DURATIONS
};

