/**
 * Start Watch Use Case
 * Application layer - use case
 */

const { ValidationError } = require('../../../shared/domain/errors');
const { GoogleAccountNotLinkedError } = require('../../domain/errors');
const crypto = require('crypto');

class StartWatchUseCase {
  constructor({ userRepository, googleCalendarAdapter }) {
    this.userRepository = userRepository;
    this.googleCalendarAdapter = googleCalendarAdapter;
  }

  /**
   * Execute start watch
   * @param {string} userId - User ID
   * @param {string} calendarId - Google calendar ID
   * @returns {Promise<Object>} Watch result
   */
  async execute(userId, calendarId) {
    if (!calendarId) {
      throw new ValidationError('calendarId is required');
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (!user.googleCalendar || !user.googleCalendar.refreshToken) {
      throw new GoogleAccountNotLinkedError('No Google account linked.');
    }

    const channelId = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
    const webhookUrl = process.env.GOOGLE_WEBHOOK_URL || `${process.env.APP_URL}/api/v1/webhooks/google-calendar`;

    const watchResult = await this.googleCalendarAdapter.startWatch(
      user,
      calendarId,
      channelId,
      webhookUrl
    );

    return watchResult;
  }
}

module.exports = StartWatchUseCase;

