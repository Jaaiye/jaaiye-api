/**
 * Password Domain Service
 * Handles password hashing, comparison, and code generation
 * Pure domain logic
 */

const bcrypt = require('bcryptjs');
const crypto = require('crypto');

class PasswordService {
  /**
   * Hash password using bcrypt
   * @param {string} password - Plain text password
   * @returns {Promise<string>} Hashed password
   */
  static async hash(password) {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
  }

  /**
   * Compare password with hash
   * @param {string} password - Plain text password
   * @param {string} hash - Hashed password
   * @returns {Promise<boolean>} True if match
   */
  static async compare(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Generate 6-digit verification code
   * @returns {string} 6-digit code
   */
  static generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Generate 6-digit reset code
   * @returns {string} 6-digit code
   */
  static generateResetCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Generate random secure password
   * @param {number} length - Password length (default: 12)
   * @returns {string} Random password
   */
  static generateRandomPassword(length = 12) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';

    // Ensure at least one of each type
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]; // uppercase
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]; // lowercase
    password += '0123456789'[Math.floor(Math.random() * 10)]; // number
    password += '!@#$%^&*'[Math.floor(Math.random() * 8)]; // special

    // Fill remaining length
    for (let i = 4; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }

    // Shuffle password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Generate cryptographically secure token
   * @param {number} length - Token length in bytes (default: 32)
   * @returns {string} Hex token
   */
  static generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Validate password strength
   * @param {string} password - Password to validate
   * @returns {Object} Validation result { isValid, score, feedback }
   */
  static validateStrength(password) {
    const feedback = [];
    let score = 0;

    // Length check
    if (password.length >= 8) score += 20;
    else feedback.push('Password should be at least 8 characters');

    if (password.length >= 12) score += 10;

    // Complexity checks
    if (/[a-z]/.test(password)) {
      score += 15;
    } else {
      feedback.push('Add lowercase letters');
    }

    if (/[A-Z]/.test(password)) {
      score += 15;
    } else {
      feedback.push('Add uppercase letters');
    }

    if (/\d/.test(password)) {
      score += 15;
    } else {
      feedback.push('Add numbers');
    }

    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      score += 25;
    } else {
      feedback.push('Add special characters');
    }

    // Common password check
    const commonPasswords = ['password', '123456', 'qwerty', 'admin', 'letmein'];
    if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
      score -= 30;
      feedback.push('Avoid common passwords');
    }

    return {
      isValid: score >= 50,
      score: Math.max(0, Math.min(100, score)),
      feedback: feedback.length > 0 ? feedback : ['Password is strong'],
      strength: score < 30 ? 'weak' : score < 60 ? 'medium' : score < 80 ? 'strong' : 'very-strong'
    };
  }
}

module.exports = PasswordService;

