/**
 * Password Value Object
 * Validates password strength and requirements
 */

const { ValidationError } = require('../errors');

class PasswordVO {
  constructor(password, options = {}) {
    const {
      minLength = 8,
      requireUppercase = false,
      requireLowercase = false,
      requireNumbers = false,
      requireSpecialChars = false
    } = options;

    if (!password || typeof password !== 'string') {
      throw new ValidationError('Password is required');
    }

    this.validateStrength(password, {
      minLength,
      requireUppercase,
      requireLowercase,
      requireNumbers,
      requireSpecialChars
    });

    // Make immutable
    Object.defineProperty(this, 'value', {
      value: password,
      writable: false,
      enumerable: true
    });
  }

  /**
   * Validate password strength
   * @param {string} password
   * @param {Object} rules
   * @throws {ValidationError}
   */
  validateStrength(password, rules) {
    if (password.length < rules.minLength) {
      throw new ValidationError(`Password must be at least ${rules.minLength} characters long`);
    }

    if (rules.requireUppercase && !/[A-Z]/.test(password)) {
      throw new ValidationError('Password must contain at least one uppercase letter');
    }

    if (rules.requireLowercase && !/[a-z]/.test(password)) {
      throw new ValidationError('Password must contain at least one lowercase letter');
    }

    if (rules.requireNumbers && !/\d/.test(password)) {
      throw new ValidationError('Password must contain at least one number');
    }

    if (rules.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      throw new ValidationError('Password must contain at least one special character');
    }
  }

  /**
   * Calculate password strength (0-100)
   * @returns {number}
   */
  getStrength() {
    let strength = 0;

    // Length score (max 40 points)
    strength += Math.min(40, this.value.length * 4);

    // Character variety (max 60 points)
    if (/[a-z]/.test(this.value)) strength += 10;
    if (/[A-Z]/.test(this.value)) strength += 15;
    if (/\d/.test(this.value)) strength += 15;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(this.value)) strength += 20;

    return Math.min(100, strength);
  }

  /**
   * Get password strength label
   * @returns {string} weak|medium|strong|very-strong
   */
  getStrengthLabel() {
    const strength = this.getStrength();

    if (strength < 30) return 'weak';
    if (strength < 60) return 'medium';
    if (strength < 80) return 'strong';
    return 'very-strong';
  }

  /**
   * Check if password is strong enough
   * @param {number} minimumStrength
   * @returns {boolean}
   */
  isStrongEnough(minimumStrength = 50) {
    return this.getStrength() >= minimumStrength;
  }

  /**
   * Convert to string (returns the value)
   * @returns {string}
   */
  toString() {
    return this.value;
  }
}

module.exports = PasswordVO;

