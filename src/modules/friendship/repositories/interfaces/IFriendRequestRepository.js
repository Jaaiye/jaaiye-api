/**
 * Friend Request Repository Interface (Port)
 * Defines contract for friend request persistence
 */

class IFriendRequestRepository {
  /**
   * Find friend request by ID
   * @param {string} requestId - Request ID
   * @returns {Promise<FriendRequestEntity|null>}
   */
  async findById(requestId) {
    throw new Error('Method not implemented');
  }

  /**
   * Create friend request
   * @param {string} requesterId - Requester user ID
   * @param {string} recipientId - Recipient user ID
   * @param {string} message - Optional message
   * @returns {Promise<FriendRequestEntity>}
   */
  async create(requesterId, recipientId, message) {
    throw new Error('Method not implemented');
  }

  /**
   * Find pending request between two users
   * @param {string} requesterId - Requester user ID
   * @param {string} recipientId - Recipient user ID
   * @returns {Promise<FriendRequestEntity|null>}
   */
  async findPendingRequest(requesterId, recipientId) {
    throw new Error('Method not implemented');
  }

  /**
   * Get pending requests for a user
   * @param {string} userId - User ID
   * @param {string} type - 'received', 'sent', or 'all'
   * @returns {Promise<FriendRequestEntity[]>}
   */
  async getPendingRequests(userId, type = 'received') {
    throw new Error('Method not implemented');
  }

  /**
   * Update request status
   * @param {string} requestId - Request ID
   * @param {string} status - New status
   * @returns {Promise<FriendRequestEntity>}
   */
  async updateStatus(requestId, status) {
    throw new Error('Method not implemented');
  }

  /**
   * Check if request exists between two users
   * @param {string} requesterId - Requester user ID
   * @param {string} recipientId - Recipient user ID
   * @returns {Promise<boolean>}
   */
  async requestExists(requesterId, recipientId) {
    throw new Error('Method not implemented');
  }

  /**
   * Cleanup expired requests
   * @returns {Promise<number>} Number of requests updated
   */
  async cleanupExpired() {
    throw new Error('Method not implemented');
  }
}

module.exports = IFriendRequestRepository;


