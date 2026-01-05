/**
 * Unblock User Use Case
 * Application layer - use case
 */

const { UserNotBlockedError, FriendshipNotFoundError } = require('../errors');

class UnblockUserUseCase {
  constructor({ friendshipRepository }) {
    this.friendshipRepository = friendshipRepository;
  }

  /**
   * Execute unblock user
   * @param {string} currentUserId - Current user ID
   * @param {string} unblockUserId - User ID to unblock
   * @returns {Promise<void>}
   */
  async execute(currentUserId, unblockUserId) {
    const friendship = await this.friendshipRepository.findFriendship(currentUserId, unblockUserId);
    if (!friendship) {
      throw new FriendshipNotFoundError('Friendship not found', 404);
    }

    if (!friendship.isBlocked()) {
      throw new UserNotBlockedError('User is not blocked', 400);
    }

    await this.friendshipRepository.unblock(currentUserId, unblockUserId);
  }
}

module.exports = UnblockUserUseCase;

