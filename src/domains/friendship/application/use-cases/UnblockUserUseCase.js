/**
 * Unblock User Use Case
 * Application layer - use case
 */

const { UserNotBlockedError, FriendshipNotFoundError } = require('../../domain/errors');

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
      throw new FriendshipNotFoundError();
    }

    if (!friendship.isBlocked()) {
      throw new UserNotBlockedError();
    }

    await this.friendshipRepository.unblock(currentUserId, unblockUserId);
  }
}

module.exports = UnblockUserUseCase;

