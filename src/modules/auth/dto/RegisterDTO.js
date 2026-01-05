/**
 * Register Data Transfer Object
 * Validates and transforms registration input
 */

class RegisterDTO {
  constructor({ email, username, fullName, password }) {
    this.email = email?.toLowerCase().trim();
    // this.username = username?.trim();
    // this.fullName = fullName?.trim();
    this.password = password;
  }

  /**
   * Validate DTO
   * @returns {Object} { valid: boolean, errors: string[] }
   */
  validate() {
    const errors = [];

    if (!this.email) {
      errors.push('Email is required');
    } else if (!/\S+@\S+\.\S+/.test(this.email)) {
      errors.push('Invalid email format');
    }

    // if (!this.username) {
    //   errors.push('Username is required');
    // } else if (this.username.length < 3) {
    //   errors.push('Username must be at least 3 characters');
    // } else if (!/^[a-zA-Z0-9_]+$/.test(this.username)) {
    //   errors.push('Username can only contain letters, numbers, and underscores');
    // }

    // if (!this.fullName) {
    //   errors.push('Full name is required');
    // } else if (this.fullName.length < 2) {
    //   errors.push('Full name must be at least 2 characters');
    // }

    if (!this.password) {
      errors.push('Password is required');
    } else if (this.password.length < 6) {
      errors.push('Password must be at least 6 characters');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

module.exports = RegisterDTO;

