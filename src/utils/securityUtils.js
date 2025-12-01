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

module.exports = {
  generateDeviceFingerprint,
  rateLimitKey
};

