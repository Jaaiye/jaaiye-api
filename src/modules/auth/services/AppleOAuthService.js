/**
 * Apple OAuth Service
 * Handles Apple Sign In token verification and user data extraction
 */

const jwt = require('jsonwebtoken');
const axios = require('axios');
const { InvalidTokenError } = require('../errors');

class AppleOAuthService {
  /**
   * Apple's public keys endpoint
   * @private
   */
  static APPLE_KEYS_URL = 'https://appleid.apple.com/auth/keys';

  /**
   * Cache for Apple's public keys
   * @private
   */
  static keysCache = {
    keys: null,
    expiresAt: null
  };

  /**
   * Get Apple's public keys (with caching)
   * @private
   * @returns {Promise<Object>} Apple's public keys
   */
  static async getApplePublicKeys() {
    // Return cached keys if still valid
    if (this.keysCache.keys && this.keysCache.expiresAt > Date.now()) {
      return this.keysCache.keys;
    }

    try {
      const response = await axios.get(this.APPLE_KEYS_URL);
      const keys = response.data;

      // Cache keys for 1 hour
      this.keysCache.keys = keys;
      this.keysCache.expiresAt = Date.now() + 60 * 60 * 1000;

      return keys;
    } catch (error) {
      throw new InvalidTokenError('Failed to fetch Apple public keys');
    }
  }

  /**
   * Get the public key matching the token's key ID
   * @private
   * @param {string} kid - Key ID from token header
   * @returns {Promise<string>} Public key in PEM format
   */
  static async getPublicKey(kid) {
    const keys = await this.getApplePublicKeys();
    const key = keys.keys.find(k => k.kid === kid);

    if (!key) {
      throw new InvalidTokenError('Apple public key not found');
    }

    // Convert JWK to PEM format using crypto
    const crypto = require('crypto');

    // Create public key from JWK
    const jwk = {
      kty: key.kty,
      n: key.n,
      e: key.e
    };

    const keyObject = crypto.createPublicKey({
      key: jwk,
      format: 'jwk'
    });

    return keyObject.export({ format: 'pem', type: 'spki' });
  }

  /**
   * Verify Apple ID token
   * @param {string} identityToken - Apple ID token (JWT)
   * @returns {Promise<Object>} Token payload { sub, email, email_verified }
   * @throws {InvalidTokenError} If token is invalid
   */
  static async verifyAppleIdToken(identityToken) {
    try {
      // Decode token header to get key ID
      const decoded = jwt.decode(identityToken, { complete: true });

      if (!decoded || !decoded.header || !decoded.header.kid) {
        throw new InvalidTokenError('Invalid Apple ID token format');
      }

      const kid = decoded.header.kid;
      const publicKey = await this.getPublicKey(kid);

      // Get Apple client IDs from environment
      const serviceId = process.env.APPLE_CLIENT_ID; // com.jaaiye.apple.signin
      const bundleId = process.env.APPLE_BUNDLE_ID; // com.jaaiye.app (iOS bundle ID)

      if (!serviceId) {
        throw new Error('APPLE_CLIENT_ID environment variable is not set');
      }

      // Accept both service ID and bundle ID as valid audiences
      const validAudiences = [serviceId];
      if (bundleId) {
        validAudiences.push(bundleId);
      }

      // Verify token
      const payload = jwt.verify(identityToken, publicKey, {
        algorithms: ['RS256'],
        issuer: 'https://appleid.apple.com',
        audience: validAudiences
      });

      // Apple provides name as a JSON string on first sign-in only
      let name = null;
      if (payload.name) {
        try {
          name = typeof payload.name === 'string' ? JSON.parse(payload.name) : payload.name;
        } catch (e) {
          name = null;
        }
      }

      return {
        sub: payload.sub,
        email: payload.email,
        emailVerified: payload.email_verified || false,
        name: name
      };
    } catch (error) {
      if (error instanceof InvalidTokenError) {
        throw error;
      }
      throw new InvalidTokenError('Invalid Apple ID token: ' + error.message);
    }
  }

  /**
   * Extract user info from Apple OAuth payload
   * @param {Object} payload - Apple OAuth payload
   * @param {Object} userData - Additional user data from client (name, etc.)
   * @returns {Object} Normalized user info
   */
  static extractAppleUserInfo(payload, userData = {}) {
    // Apple provides name only on first sign-in
    // If not in token, check userData passed from client
    const fullName = payload.name
      ? `${payload.name.firstName || ''} ${payload.name.lastName || ''}`.trim()
      : userData.fullName || userData.name || null;

    return {
      email: payload.email,
      emailVerified: payload.emailVerified || false,
      fullName: fullName || 'User',
      firstName: payload.name?.firstName || userData.firstName || null,
      lastName: payload.name?.lastName || userData.lastName || null,
      appleId: payload.sub
    };
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
}

module.exports = AppleOAuthService;

