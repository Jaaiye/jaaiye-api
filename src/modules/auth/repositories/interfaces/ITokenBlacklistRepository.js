/**
 * Token Blacklist Repository Interface (Port)
 * Defines contract for token blacklist persistence
 * Infrastructure layer must implement this
 */

class ITokenBlacklistRepository {
  /**
   * Add token to blacklist
   * @param {string} token - JWT token
   * @param {Date} expiresAt - Token expiration date
   * @returns {Promise<void>}
   */
  async add(token, expiresAt) {
    throw new Error('Method not implemented');
  }

  /**
   * Check if token is blacklisted
   * @param {string} token - JWT token
   * @returns {Promise<boolean>}
   */
  async isBlacklisted(token) {
    throw new Error('Method not implemented');
  }

  /**
   * Remove expired tokens (cleanup)
   * @returns {Promise<number>} Number of tokens removed
   */
  async removeExpired() {
    throw new Error('Method not implemented');
  }

  /**
   * Get all blacklisted tokens for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>}
   */
  async findByUserId(userId) {
    throw new Error('Method not implemented');
  }

  /**
   * Blacklist all tokens for a user (for logout all devices)
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async blacklistAllForUser(userId) {
    throw new Error('Method not implemented');
  }
}

module.exports = ITokenBlacklistRepository;

