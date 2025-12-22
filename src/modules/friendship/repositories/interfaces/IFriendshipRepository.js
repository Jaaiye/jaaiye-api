/**
 * Friendship Repository Interface (Port)
 * Defines contract for friendship persistence
 */

class IFriendshipRepository {
  /**
   * Find friendship between two users
   * @param {string} user1Id - First user ID
   * @param {string} user2Id - Second user ID
   * @returns {Promise<FriendshipEntity|null>}
   */
  async findFriendship(user1Id, user2Id) {
    throw new Error('Method not implemented');
  }

  /**
   * Create friendship
   * @param {string} user1Id - First user ID
   * @param {string} user2Id - Second user ID
   * @param {string} initiatedBy - User who initiated
   * @returns {Promise<FriendshipEntity>}
   */
  async create(user1Id, user2Id, initiatedBy) {
    throw new Error('Method not implemented');
  }

  /**
   * Get all friends for a user
   * @param {string} userId - User ID
   * @param {string} status - Friendship status (default: 'active')
   * @returns {Promise<FriendshipEntity[]>}
   */
  async getFriends(userId, status = 'active') {
    throw new Error('Method not implemented');
  }

  /**
   * Check if two users are friends
   * @param {string} user1Id - First user ID
   * @param {string} user2Id - Second user ID
   * @returns {Promise<boolean>}
   */
  async areFriends(user1Id, user2Id) {
    throw new Error('Method not implemented');
  }

  /**
   * Remove friendship
   * @param {string} user1Id - First user ID
   * @param {string} user2Id - Second user ID
   * @returns {Promise<void>}
   */
  async remove(user1Id, user2Id) {
    throw new Error('Method not implemented');
  }

  /**
   * Block friendship
   * @param {string} user1Id - First user ID
   * @param {string} user2Id - Second user ID
   * @param {string} blockedBy - User who blocked
   * @returns {Promise<FriendshipEntity>}
   */
  async block(user1Id, user2Id, blockedBy) {
    throw new Error('Method not implemented');
  }

  /**
   * Unblock friendship
   * @param {string} user1Id - First user ID
   * @param {string} user2Id - Second user ID
   * @returns {Promise<FriendshipEntity>}
   */
  async unblock(user1Id, user2Id) {
    throw new Error('Method not implemented');
  }

  /**
   * Get mutual friends between two users
   * @param {string} user1Id - First user ID
   * @param {string} user2Id - Second user ID
   * @returns {Promise<string[]>} Array of mutual friend IDs
   */
  async getMutualFriends(user1Id, user2Id) {
    throw new Error('Method not implemented');
  }
}

module.exports = IFriendshipRepository;


