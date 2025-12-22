/**
 * Stop Watch Use Case
 * Application layer - use case
 */

const { GoogleAccountNotLinkedError } = require('../errors');

class StopWatchUseCase {
  constructor({ userRepository, googleCalendarAdapter }) {
    this.userRepository = userRepository;
    this.googleCalendarAdapter = googleCalendarAdapter;
  }

  /**
   * Execute stop watch
   * @param {string} userId - User ID
   * @param {string} calendarId - Google calendar ID
   * @returns {Promise<void>}
   */
  async execute(userId, calendarId) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (!user.googleCalendar || !user.googleCalendar.refreshToken) {
      throw new GoogleAccountNotLinkedError('No Google account linked.');
    }

    await this.googleCalendarAdapter.stopWatch(user, calendarId);
  }
}

module.exports = StopWatchUseCase;

