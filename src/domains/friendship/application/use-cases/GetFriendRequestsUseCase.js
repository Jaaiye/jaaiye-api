/**
 * Get Friend Requests Use Case
 * Application layer - use case
 */

class GetFriendRequestsUseCase {
  constructor({ friendRequestRepository }) {
    this.friendRequestRepository = friendRequestRepository;
  }

  /**
   * Execute get friend requests
   * @param {string} userId - User ID
   * @param {string} type - 'received', 'sent', or 'all'
   * @returns {Promise<Object>} Friend requests
   */
  async execute(userId, type = 'received') {
    const requests = await this.friendRequestRepository.getPendingRequests(userId, type);
    return { requests: requests.map(req => req.toObject()) };
  }
}

module.exports = GetFriendRequestsUseCase;


