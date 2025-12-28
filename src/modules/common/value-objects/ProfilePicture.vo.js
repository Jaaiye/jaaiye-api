/**
 * ProfilePicture Value Object
 * Domain layer - value object
 * Represents a user's profile picture (emoji + color)
 */

class ProfilePicture {
  constructor({ emoji, color, backgroundColor }) {
    if (!emoji || typeof emoji !== 'string') {
      throw new Error('Emoji is required and must be a string');
    }

    // Accept either 'color' or 'backgroundColor' for flexibility
    const colorValue = color || backgroundColor;
    if (!colorValue || typeof colorValue !== 'string') {
      throw new Error('Color is required and must be a string');
    }

    // Validate color format (hex: 3, 6, or 8 digits)
    const colorRegex = /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/;
    if (!colorRegex.test(colorValue)) {
      throw new Error('Invalid color format. Please use 3, 6, or 8-digit hex color code (e.g., #FF0000 or #FFE91E63)');
    }

    this.emoji = emoji;
    this.color = colorValue;
  }

  /**
   * Convert to plain object
   * @returns {Object}
   */
  toJSON() {
    return {
      emoji: this.emoji,
      backgroundColor: this.color // Match database schema field name
    };
  }

  /**
   * Check equality
   * @param {ProfilePicture} other
   * @returns {boolean}
   */
  equals(other) {
    if (!(other instanceof ProfilePicture)) {
      return false;
    }
    return this.emoji === other.emoji && this.color === other.color;
  }
}

module.exports = ProfilePicture;

