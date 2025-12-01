/**
 * TokenBlacklist Domain Entity
 * Represents a blacklisted JWT token
 */

class TokenBlacklistEntity {
  constructor({
    id,
    token,
    userId,
    reason = 'logout',
    expiresAt,
    createdAt
  }) {
    this.id = id;
    this.token = token;
    this.userId = userId;
    this.reason = reason;
    this.expiresAt = expiresAt;
    this.createdAt = createdAt;
  }

  /**
   * Business Rule: Is token expired?
   * @returns {boolean}
   */
  isExpired() {
    return new Date() > this.expiresAt;
  }

  /**
   * Business Rule: Should token be removed from blacklist?
   * Expired tokens can be cleaned up
   * @returns {boolean}
   */
  canBeRemoved() {
    return this.isExpired();
  }

  /**
   * Convert to plain object
   * @returns {Object}
   */
  toObject() {
    return {
      id: this.id,
      token: this.token,
      userId: this.userId,
      reason: this.reason,
      expiresAt: this.expiresAt,
      createdAt: this.createdAt
    };
  }
}

module.exports = TokenBlacklistEntity;

