/**
 * Apple OAuth Data Transfer Object
 * Validates and transforms Apple Sign In input
 */

class AppleOAuthDTO {
  constructor({ identityToken, userData }) {
    this.identityToken = identityToken?.trim();
    // userData contains name, email (optional, only on first sign-in)
    this.userData = userData || {};
  }

  /**
   * Validate DTO
   * @returns {Object} { valid: boolean, errors: string[] }
   */
  validate() {
    const errors = [];

    if (!this.identityToken) {
      errors.push('Apple identity token is required');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

module.exports = AppleOAuthDTO;

