/**
 * Token Blacklist Repository Implementation
 * Implements ITokenBlacklistRepository interface
 * Infrastructure layer - persistence
 */

const ITokenBlacklistRepository = require('./interfaces/ITokenBlacklistRepository');
const TokenBlacklistSchema = require('../entities/TokenBlacklist.schema');
const { TokenService } = require('../../common/services');

class TokenBlacklistRepository extends ITokenBlacklistRepository {
  /**
   * Add token to blacklist
   * @param {string} token - JWT token
   * @param {Date} expiresAt - Token expiration date
   * @returns {Promise<void>}
   */
  async add(token, expiresAt) {
    const userId = TokenService.extractUserId(token);

    await TokenBlacklistSchema.create({
      token,
      userId,
      expiresAt
    });
  }

  /**
   * Check if token is blacklisted
   * @param {string} token - JWT token
   * @returns {Promise<boolean>}
   */
  async isBlacklisted(token) {
    const count = await TokenBlacklistSchema.countDocuments({ token });
    return count > 0;
  }

  /**
   * Remove expired tokens (cleanup)
   * @returns {Promise<number>} Number of tokens removed
   */
  async removeExpired() {
    const now = new Date();
    const result = await TokenBlacklistSchema.deleteMany({
      expiresAt: { $lt: now }
    });

    return result.deletedCount;
  }

  /**
   * Get all blacklisted tokens for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>}
   */
  async findByUserId(userId) {
    const tokens = await TokenBlacklistSchema.find({ userId });
    return tokens.map(doc => doc.toObject());
  }

  /**
   * Blacklist all tokens for a user (for logout all devices)
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async blacklistAllForUser(userId) {
    // This is a placeholder - in practice, you'd need to track all active tokens
    // For now, we'll just mark a flag that all tokens before this timestamp are invalid
    // You could implement this by adding a 'tokenVersion' field to User entity
    // For simplicity, this implementation does nothing special
    // The actual implementation would depend on your token invalidation strategy
  }
}

module.exports = TokenBlacklistRepository;

