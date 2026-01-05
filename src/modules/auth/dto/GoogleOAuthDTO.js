/**
 * Google OAuth Data Transfer Object
 * Validates and transforms Google OAuth input
 */

class GoogleOAuthDTO {
  constructor({ idToken, serverAuthCode }) {
    this.idToken = idToken?.trim();
    this.serverAuthCode = serverAuthCode?.trim(); // Optional - for calendar linking
  }

  /**
   * Validate DTO
   * @returns {Object} { valid: boolean, errors: string[] }
   */
  validate() {
    const errors = [];

    if (!this.idToken && !this.serverAuthCode) {
      errors.push('Google ID token or server auth code is required');
    }



    return {
      valid: errors.length === 0,
      errors
    };
  }
}

module.exports = GoogleOAuthDTO;

