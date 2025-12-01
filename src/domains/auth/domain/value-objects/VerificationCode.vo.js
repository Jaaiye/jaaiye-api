/**
 * VerificationCode Value Object
 * Represents a time-limited verification code
 */

const { ValidationError } = require('../errors');

class VerificationCodeVO {
  constructor(code, expiresAt) {
    if (!code || typeof code !== 'string') {
      throw new ValidationError('Verification code is required');
    }

    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      throw new ValidationError('Verification code must be 6 digits');
    }

    if (!expiresAt || !(expiresAt instanceof Date)) {
      throw new ValidationError('Expiration date is required');
    }

    // Make immutable
    Object.defineProperty(this, 'code', {
      value: code,
      writable: false,
      enumerable: true
    });

    Object.defineProperty(this, 'expiresAt', {
      value: expiresAt,
      writable: false,
      enumerable: true
    });
  }

  /**
   * Check if code is expired
   * @returns {boolean}
   */
  isExpired() {
    return new Date() > this.expiresAt;
  }

  /**
   * Check if code is valid
   * @returns {boolean}
   */
  isValid() {
    return !this.isExpired();
  }

  /**
   * Get remaining time in minutes
   * @returns {number}
   */
  getRemainingMinutes() {
    if (this.isExpired()) return 0;

    const diff = this.expiresAt - new Date();
    return Math.floor(diff / 60000);
  }

  /**
   * Check if code matches
   * @param {string} inputCode
   * @returns {boolean}
   */
  matches(inputCode) {
    return this.code === inputCode;
  }

  /**
   * Convert to object
   * @returns {Object}
   */
  toObject() {
    return {
      code: this.code,
      expiresAt: this.expiresAt,
      isExpired: this.isExpired(),
      remainingMinutes: this.getRemainingMinutes()
    };
  }
}

module.exports = VerificationCodeVO;

