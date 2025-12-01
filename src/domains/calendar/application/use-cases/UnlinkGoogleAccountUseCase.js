/**
 * Unlink Google Account Use Case
 * Application layer - use case
 */

const { GoogleAccountNotLinkedError } = require('../../domain/errors');

class UnlinkGoogleAccountUseCase {
  constructor({ userRepository }) {
    this.userRepository = userRepository;
  }

  /**
   * Execute unlink Google account
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async execute(userId) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (!user.googleCalendar || !user.googleCalendar.refreshToken) {
      throw new GoogleAccountNotLinkedError('No Google account linked to unlink');
    }

    // Clear Google Calendar data
    await this.userRepository.update(userId, {
      'googleCalendar': undefined,
      'providerLinks.google': false
    });
  }
}

module.exports = UnlinkGoogleAccountUseCase;

