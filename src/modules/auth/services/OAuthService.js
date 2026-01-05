/**
 * OAuth Domain Service
 * Handles OAuth verification and user data extraction
 * Currently supports Google OAuth
 */

const { OAuth2Client } = require('google-auth-library');
const { InvalidTokenError } = require('../errors');

class OAuthService {
  /**
   * Get Google OAuth client (singleton)
   * @private
   * @returns {OAuth2Client}
   */
  static getGoogleClient() {
    if (!this.googleClient) {
      const clientId = process.env.GOOGLE_CLIENT_ID || undefined;
      this.googleClient = new OAuth2Client(clientId);
    }
    return this.googleClient;
  }

  /**
   * Get allowed Google audiences from env
   * @private
   * @returns {string[]}
   */
  static getAllowedGoogleAudiences() {
    const list = process.env.GOOGLE_ALLOWED_AUDS || '';
    return list
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
  }

  /**
   * Verify Google ID token
   * @param {string} idToken - Google ID token
   * @returns {Promise<Object>} Token payload { sub, email, email_verified, name, picture }
   * @throws {InvalidTokenError} If token is invalid
   */
  static async verifyGoogleIdToken(idToken) {
    try {
      const client = this.getGoogleClient();
      const audiences = this.getAllowedGoogleAudiences();

      const ticket = await client.verifyIdToken({
        idToken,
        audience: audiences.length ? audiences : undefined
      });

      const payload = ticket.getPayload();

      return {
        sub: payload.sub,
        email: payload.email,
        emailVerified: payload.email_verified,
        name: payload.name,
        picture: payload.picture,
        givenName: payload.given_name,
        familyName: payload.family_name
      };
    } catch (error) {
      throw new InvalidTokenError('Invalid Google ID token');
    }
  }

  /**
   * Extract user info from Google OAuth payload
   * @param {Object} payload - Google OAuth payload
   * @returns {Object} Normalized user info
   */
  static extractGoogleUserInfo(payload) {
    return {
      email: payload.email,
      emailVerified: payload.emailVerified || payload.email_verified || false,
      fullName: payload.name || `${payload.givenName} ${payload.familyName}`.trim(),
      firstName: payload.givenName || payload.given_name,
      lastName: payload.familyName || payload.family_name,
      profilePicture: payload.picture,
      googleId: payload.sub
    };
  }

  /**
   * Check if audience is allowed
   * @param {string} audience - OAuth audience
   * @returns {boolean}
   */
  static isAllowedAudience(audience) {
    const allowed = this.getAllowedGoogleAudiences();
    if (allowed.length === 0) return true; // If no restrictions, allow all
    return allowed.includes(audience);
  }

  /**
   * Generate username from email
   * @param {string} email - Email address
   * @returns {string} Username
   */
  static generateUsernameFromEmail(email) {
    const username = email.split('@')[0];
    // Remove special characters, keep alphanumeric and underscores
    return username.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
  }

  /**
   * Check if email domain is allowed
   * @param {string} email - Email address
   * @param {string[]} allowedDomains - List of allowed domains
   * @returns {boolean}
   */
  static isEmailDomainAllowed(email, allowedDomains = []) {
    if (allowedDomains.length === 0) return true;

    const domain = email.split('@')[1];
    return allowedDomains.includes(domain);
  }
}

module.exports = OAuthService;

