/**
 * Email Value Object
 * Immutable, self-validating email representation
 */

const { ValidationError } = require('../errors');

class EmailVO {
  constructor(email) {
    if (!email || typeof email !== 'string') {
      throw new ValidationError('Email is required');
    }

    const trimmedEmail = email.trim().toLowerCase();

    if (!this.isValid(trimmedEmail)) {
      throw new ValidationError('Invalid email format');
    }

    // Make immutable
    Object.defineProperty(this, 'value', {
      value: trimmedEmail,
      writable: false,
      enumerable: true
    });
  }

  /**
   * Validate email format
   * @param {string} email
   * @returns {boolean}
   */
  isValid(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Get domain part of email
   * @returns {string}
   */
  getDomain() {
    return this.value.split('@')[1];
  }

  /**
   * Check if email is from a specific domain
   * @param {string} domain
   * @returns {boolean}
   */
  isFromDomain(domain) {
    return this.getDomain() === domain.toLowerCase();
  }

  /**
   * Convert to string
   * @returns {string}
   */
  toString() {
    return this.value;
  }

  /**
   * Check equality
   * @param {EmailVO} other
   * @returns {boolean}
   */
  equals(other) {
    return other instanceof EmailVO && this.value === other.value;
  }
}

module.exports = EmailVO;

