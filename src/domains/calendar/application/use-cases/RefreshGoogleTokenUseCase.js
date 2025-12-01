/**
 * Refresh Google Token Use Case
 * Application layer - use case
 */

const { GoogleAccountNotLinkedError } = require('../../domain/errors');

class RefreshGoogleTokenUseCase {
  constructor({ userRepository, googleCalendarAdapter }) {
    this.userRepository = userRepository;
    this.googleCalendarAdapter = googleCalendarAdapter;
  }

  /**
   * Execute refresh Google token
   * @param {string} userId - User ID
   * @returns {Promise<Object>} New token info
   */
  async execute(userId) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (!user.googleCalendar || !user.googleCalendar.refreshToken) {
      throw new GoogleAccountNotLinkedError('No Google account linked. Please link your Google account first.');
    }

    const newTokens = await this.googleCalendarAdapter.refreshAccessToken(user);

    // Update user with new tokens
    await this.userRepository.update(userId, {
      'googleCalendar.accessToken': newTokens.access_token,
      'googleCalendar.expiryDate': newTokens.expiry_date
    });

    return {
      message: 'Access token refreshed successfully',
      expiresAt: newTokens.expiry_date
    };
  }
}

module.exports = RefreshGoogleTokenUseCase;

