/**
 * Change Password DTO
 * Application layer - data transfer object
 */

class ChangePasswordDTO {
  constructor(data) {
    this.currentPassword = data.currentPassword;
    this.newPassword = data.newPassword;
  }

  /**
   * Validate DTO
   * @throws {Error} If validation fails
   */
  validate() {
    if (!this.currentPassword) {
      throw new Error('Current password is required');
    }

    if (!this.newPassword || this.newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters long');
    }
  }
}

module.exports = ChangePasswordDTO;

