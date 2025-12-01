/**
 * Get Firebase Token Use Case
 * Application layer - use case
 */

const { UserNotFoundError } = require('../../../shared/domain/errors');

class GetFirebaseTokenUseCase {
  constructor({ userRepository, firebaseAdapter }) {
    this.userRepository = userRepository;
    this.firebaseAdapter = firebaseAdapter;
  }

  /**
   * Execute get Firebase token
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Firebase token
   */
  async execute(userId) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundError();
    }

    if (!this.firebaseAdapter) {
      throw new Error('Firebase adapter not configured');
    }

    const firebaseToken = await this.firebaseAdapter.generateToken(userId);

    await this.userRepository.updateFirebaseToken(userId, firebaseToken);

    return {
      firebaseToken
    };
  }
}

module.exports = GetFirebaseTokenUseCase;

