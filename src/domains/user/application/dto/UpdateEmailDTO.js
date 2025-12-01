/**
 * Update Email DTO
 * Application layer - data transfer object
 */

class UpdateEmailDTO {
  constructor(data) {
    this.email = data.email?.toLowerCase().trim();
    this.currentPassword = data.currentPassword;
  }

  /**
   * Validate DTO
   * @throws {Error} If validation fails
   */
  validate() {
    if (!this.email) {
      throw new Error('Email is required');
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      throw new Error('Invalid email format');
    }

    if (!this.currentPassword) {
      throw new Error('Current password is required');
    }
  }
}

module.exports = UpdateEmailDTO;

