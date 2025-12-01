/**
 * Block User Use Case
 * Application layer - use case
 */

const { NotFoundError, BadRequestError } = require('../../../shared/domain/errors');
const { CannotBlockSelfError } = require('../../domain/errors');

class BlockUserUseCase {
  constructor({ userRepository, friendshipRepository }) {
    this.userRepository = userRepository;
    this.friendshipRepository = friendshipRepository;
  }

  /**
   * Execute block user
   * @param {string} currentUserId - Current user ID
   * @param {string} blockUserId - User ID to block
   * @returns {Promise<void>}
   */
  async execute(currentUserId, blockUserId) {
    if (currentUserId === blockUserId) {
      throw new CannotBlockSelfError();
    }

    // Check if user exists
    const userToBlock = await this.userRepository.findById(blockUserId);
    if (!userToBlock) {
      throw new NotFoundError('User not found');
    }

    // Block friendship (creates if doesn't exist)
    await this.friendshipRepository.block(currentUserId, blockUserId, currentUserId);
  }
}

module.exports = BlockUserUseCase;


