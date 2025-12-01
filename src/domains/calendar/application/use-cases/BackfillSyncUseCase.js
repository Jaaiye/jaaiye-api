/**
 * Backfill Sync Use Case
 * Application layer - use case
 */

const { ValidationError } = require('../../../shared/domain/errors');
const { GoogleAccountNotLinkedError } = require('../../domain/errors');

class BackfillSyncUseCase {
  constructor({ userRepository, googleCalendarAdapter }) {
    this.userRepository = userRepository;
    this.googleCalendarAdapter = googleCalendarAdapter;
  }

  /**
   * Execute backfill sync
   * @param {string} userId - User ID
   * @param {string} calendarId - Google calendar ID
   * @param {number} daysBack - Days to sync back
   * @returns {Promise<Object>} Sync result
   */
  async execute(userId, calendarId, daysBack = 30) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (!user.googleCalendar || !user.googleCalendar.refreshToken) {
      throw new GoogleAccountNotLinkedError('No Google account linked.');
    }

    const timeMin = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();
    const timeMax = new Date().toISOString();

    const syncResult = await this.googleCalendarAdapter.backfillSelectedCalendars(
      user,
      timeMin,
      timeMax
    );

    return syncResult;
  }
}

module.exports = BackfillSyncUseCase;

