/**
 * Security Utilities
 * Shared utilities for security-related functions
 */

const crypto = require('crypto');

/**
 * Generate device fingerprint for rate limiting
 * Creates a unique identifier based on device characteristics (without IP)
 * @param {Object} req - Express request object
 * @returns {string} Device fingerprint hash
 */
function generateDeviceFingerprint(req) {
  const userAgent = req.get('user-agent') || '';
  const acceptLanguage = req.get('accept-language') || '';
  const acceptEncoding = req.get('accept-encoding') || '';

  // Create a hash of the device characteristics (excluding IP for portability)
  const data = `${userAgent}-${acceptLanguage}-${acceptEncoding}`;
  const hash = crypto.createHash('sha256').update(data).digest('hex');

  return hash;
}

/**
 * Generate rate limit key combining IP and device fingerprint
 * This provides more granular rate limiting than just IP-based
 * @param {Object} req - Express request object
 * @returns {string} Rate limit key
 */
function rateLimitKey(req) {
  const ip = req.ip || req.connection.remoteAddress;
  const deviceFingerprint = generateDeviceFingerprint(req);

  // Combine IP and device fingerprint for unique identification
  // This ensures rate limiting is both IP-aware and device-aware
  return `${ip}-${deviceFingerprint}`;
}

/**
 * Constant-time comparison of two strings, safe against timing attacks.
 * Use for comparing secrets/signatures (e.g. webhook HMAC signatures).
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
function timingSafeEqualStr(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;

  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');

  // crypto.timingSafeEqual requires equal-length buffers. Comparing against
  // a hash of `a` when lengths differ still avoids leaking the real length
  // of `b` via early-exit timing while never returning true for mismatched
  // input.
  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(crypto.createHash('sha256').update(bufA).digest(), crypto.createHash('sha256').update(bufB).digest());
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}

module.exports = {
  generateDeviceFingerprint,
  rateLimitKey,
  timingSafeEqualStr
};

