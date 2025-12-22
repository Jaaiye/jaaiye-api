/**
 * Friendship Domain Entity
 * Pure business logic, framework-agnostic
 */

class FriendshipEntity {
  constructor({
    id,
    user1,
    user2,
    status = 'active',
    initiatedBy,
    createdAt,
    updatedAt
  }) {
    this.id = id;
    this.user1 = user1;
    this.user2 = user2;
    this.status = status;
    this.initiatedBy = initiatedBy;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Business Rule: Is friendship active?
   * @returns {boolean}
   */
  isActive() {
    return this.status === 'active';
  }

  /**
   * Business Rule: Is friendship blocked?
   * @returns {boolean}
   */
  isBlocked() {
    return this.status === 'blocked';
  }

  /**
   * Business Rule: Get the other user in the friendship
   * @param {string} userId - Current user ID
   * @returns {string} Other user ID
   */
  getOtherUser(userId) {
    const userIdStr = userId.toString();
    if (this.user1.toString() === userIdStr) {
      return this.user2;
    }
    if (this.user2.toString() === userIdStr) {
      return this.user1;
    }
    return null;
  }

  /**
   * Business Rule: Check if user is part of this friendship
   * @param {string} userId - User ID to check
   * @returns {boolean}
   */
  involvesUser(userId) {
    const userIdStr = userId.toString();
    return this.user1.toString() === userIdStr || this.user2.toString() === userIdStr;
  }

  /**
   * Convert entity to plain object
   * @returns {Object}
   */
  toObject() {
    return {
      id: this.id,
      user1: this.user1,
      user2: this.user2,
      status: this.status,
      initiatedBy: this.initiatedBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = FriendshipEntity;


