/**
 * Token Blacklist Repository — Redis Implementation
 * Replaces the Mongoose-based store with pure Redis lookups.
 * Access tokens are blacklisted by jti until their natural expiry.
 */

const ITokenBlacklistRepository = require('./interfaces/ITokenBlacklistRepository');
const { TokenService } = require('../../common/services');
const redisClient = require('../../../utils/redis');

class TokenBlacklistRepository extends ITokenBlacklistRepository {
  /**
   * Add an access token to the blacklist.
   * TTL is derived from the token's own exp claim so Redis auto-evicts it.
   * @param {string} token - JWT access token
   * @param {Date} _expiresAt - Kept for interface compatibility (unused — derived from token)
   */
  async add(token, _expiresAt) {
    const jti = TokenService.extractJti(token);
    if (!jti) {
      // Legacy tokens without jti — fall back to full-token hash key
      const remaining = TokenService.getRemainingSeconds(token);
      if (remaining > 0) {
        await redisClient.set(`blacklist:token:${token.slice(-16)}`, '1', { EX: remaining });
      }
      return;
    }

    const remaining = TokenService.getRemainingSeconds(token);
    if (remaining > 0) {
      await redisClient.set(`blacklist:${jti}`, '1', { EX: remaining });
    }
  }

  /**
   * Check if a token is blacklisted.
   * @param {string} token - JWT access token
   * @returns {Promise<boolean>}
   */
  async isBlacklisted(token) {
    const jti = TokenService.extractJti(token);
    if (jti) {
      const val = await redisClient.get(`blacklist:${jti}`);
      return val !== null;
    }

    // Legacy fallback
    const val = await redisClient.get(`blacklist:token:${token.slice(-16)}`);
    return val !== null;
  }

  /**
   * No-op: Redis auto-evicts expired keys via TTL.
   * @returns {Promise<number>} Always 0
   */
  async removeExpired() {
    return 0;
  }

  /**
   * Not applicable for this Redis implementation.
   * @returns {Promise<Array>}
   */
  async findByUserId(_userId) {
    return [];
  }

  /**
   * Blacklist all active refresh tokens for a user.
   * Delegates to RedisAuthService.deleteAllRefreshTokens via caller.
   * Access token blacklisting is handled per-token at logout.
   */
  async blacklistAllForUser(_userId) {
    // Implemented at the use-case level via RedisAuthService.deleteAllRefreshTokens
  }
}

module.exports = TokenBlacklistRepository;
