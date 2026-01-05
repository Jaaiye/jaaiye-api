/**
 * Remove Friend Use Case
 * Application layer - use case
 */

const { FriendshipNotFoundError } = require('../errors');

class RemoveFriendUseCase {
  constructor({ friendshipRepository }) {
    this.friendshipRepository = friendshipRepository;
  }

  /**
   * Execute remove friend
   * @param {string} userId - Current user ID
   * @param {string} friendId - Friend user ID to remove
   * @returns {Promise<void>}
   */
  async execute(userId, friendId) {
    const friendship = await this.friendshipRepository.findFriendship(userId, friendId);
    if (!friendship) {
      throw new FriendshipNotFoundError();
    }

    await this.friendshipRepository.remove(userId, friendId);
  }
}

module.exports = RemoveFriendUseCase;


