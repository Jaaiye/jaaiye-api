/**
 * Login Data Transfer Object
 * Validates and transforms login input
 */

class LoginDTO {
  constructor({ identifier, password }) {
    // identifier can be email or username
    this.identifier = identifier?.toLowerCase().trim();
    this.password = password;
  }

  /**
   * Validate DTO
   * @returns {Object} { valid: boolean, errors: string[] }
   */
  validate() {
    const errors = [];

    if (!this.identifier) {
      errors.push('Email or username is required');
    }

    if (!this.password) {
      errors.push('Password is required');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if identifier is email
   * @returns {boolean}
   */
  isEmail() {
    return /\S+@\S+\.\S+/.test(this.identifier);
  }
}

module.exports = LoginDTO;

