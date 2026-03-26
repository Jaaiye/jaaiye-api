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
   * @returns {string|null} Other user ID or null if friend is deleted
   */
  getOtherUser(userId) {
    if (!userId) return null;
    const userIdStr = userId.toString();

    // Safely check user1
    if (this.user1?.toString() === userIdStr) {
      return this.user2;
    }
    // Safely check user2
    if (this.user2?.toString() === userIdStr) {
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
    if (!userId) return false;
    const userIdStr = userId.toString();
    
    // Using optional chaining prevents the "toString of null" crash
    const u1 = this.user1?.toString();
    const u2 = this.user2?.toString();
    
    return u1 === userIdStr || u2 === userIdStr;
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
