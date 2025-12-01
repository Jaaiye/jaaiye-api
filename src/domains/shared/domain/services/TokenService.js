/**
 * Token Domain Service
 * Handles JWT token generation, verification, and management
 * Pure domain logic - no external dependencies
 */

const jwt = require('jsonwebtoken');
const { TokenExpiredError, InvalidTokenError } = require('../../domain/errors');

class TokenService {
  /**
   * Generate access token (short-lived)
   * Includes full user info for convenience
   * @param {Object} user - User entity or user data
   * @returns {string} JWT token
   */
  static generateAccessToken(user) {
    const payload = {
      id: user.id,
      email: user.email,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      emailVerified: user.emailVerified,
      profilePicture: user.profilePicture
    };

    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE || '30d'
    });
  }

  /**
   * Generate refresh token (long-lived)
   * Only includes user ID (minimal payload)
   * @param {string} userId - User ID
   * @returns {string} JWT token
   */
  static generateRefreshToken(userId) {
    const payload = { id: userId };

    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_REFRESH_EXPIRE || '90d'
    });
  }

  /**
   * Verify access token
   * @param {string} token - JWT token
   * @returns {Object} Decoded payload
   * @throws {TokenExpiredError} If token is expired
   * @throws {InvalidTokenError} If token is invalid
   */
  static verifyAccessToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new TokenExpiredError('Access token has expired');
      }
      throw new InvalidTokenError('Invalid access token');
    }
  }

  /**
   * Verify refresh token
   * @param {string} token - JWT token
   * @returns {Object} Decoded payload
   * @throws {TokenExpiredError} If token is expired
   * @throws {InvalidTokenError} If token is invalid
   */
  static verifyRefreshToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new TokenExpiredError('Refresh token has expired');
      }
      throw new InvalidTokenError('Invalid refresh token');
    }
  }

  /**
   * Decode token without verification (for blacklist check)
   * @param {string} token - JWT token
   * @returns {Object|null} Decoded payload or null
   */
  static decodeWithoutVerify(token) {
    try {
      return jwt.decode(token);
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract user ID from token
   * @param {string} token - JWT token
   * @returns {string|null} User ID or null
   */
  static extractUserId(token) {
    const decoded = this.decodeWithoutVerify(token);
    return decoded ? decoded.id : null;
  }

  /**
   * Check if token is expired (without verification)
   * @param {string} token - JWT token
   * @returns {boolean}
   */
  static isExpired(token) {
    const decoded = this.decodeWithoutVerify(token);
    if (!decoded || !decoded.exp) {
      return true;
    }

    const now = Math.floor(Date.now() / 1000);
    return decoded.exp < now;
  }

  /**
   * Get token expiration date
   * @param {string} token - JWT token
   * @returns {Date|null} Expiration date or null
   */
  static getExpirationDate(token) {
    const decoded = this.decodeWithoutVerify(token);
    if (!decoded || !decoded.exp) {
      return null;
    }

    return new Date(decoded.exp * 1000);
  }
}

module.exports = TokenService;

