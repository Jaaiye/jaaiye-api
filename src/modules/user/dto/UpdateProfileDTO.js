/**
 * Update Profile DTO
 * Application layer - data transfer object
 */

class UpdateProfileDTO {
  constructor(data) {
    this.username = data.username;
    this.fullName = data.fullName;
    this.preferences = data.preferences;
    this.emoji = data.emoji;
    this.color = data.color;
  }

  /**
   * Validate DTO
   * @throws {Error} If validation fails
   */
  validate() {
    // Username validation
    if (this.username !== undefined) {
      if (typeof this.username !== 'string' || this.username.trim().length < 3) {
        throw new Error('Username must be at least 3 characters long');
      }
    }

    // Full name validation
    if (this.fullName !== undefined && typeof this.fullName !== 'string') {
      throw new Error('Full name must be a string');
    }

    // Color validation (if emoji is provided, color must be provided)
    if (this.emoji && !this.color) {
      throw new Error('Color is required when emoji is provided');
    }

    if (this.color && !this.emoji) {
      throw new Error('Emoji is required when color is provided');
    }
  }
}

module.exports = UpdateProfileDTO;

