/**
 * Set Primary Google Calendar Use Case
 * Application layer - use case
 */

const { CalendarNotFoundError, CalendarEditDeniedError, InvalidGoogleCalendarMappingError } = require('../errors');

class SetPrimaryGoogleCalendarUseCase {
  constructor({ calendarRepository }) {
    this.calendarRepository = calendarRepository;
  }

  /**
   * Execute set primary Google calendar
   * @param {string} calendarId - Jaaiye calendar ID
   * @param {string} userId - Current user ID
   * @param {string} primaryId - Google calendar ID to set as primary
   * @returns {Promise<Object>} Google mapping
   */
  async execute(calendarId, userId, primaryId) {
    if (!primaryId || typeof primaryId !== 'string') {
      throw new InvalidGoogleCalendarMappingError('primaryId is required and must be a string');
    }

    const calendar = await this.calendarRepository.findById(calendarId);
    if (!calendar) {
      throw new CalendarNotFoundError();
    }

    if (!calendar.isOwnedBy(userId)) {
      throw new CalendarEditDeniedError();
    }

    // Validate primaryId is in linkedIds
    const linkedIds = calendar.google?.linkedIds || [];
    if (!linkedIds.includes(primaryId)) {
      throw new InvalidGoogleCalendarMappingError('primaryId must be one of linkedIds');
    }

    // Update calendar
    const updated = await this.calendarRepository.update(calendarId, {
      'google.primaryId': primaryId
    });

    return { google: updated.google };
  }
}

module.exports = SetPrimaryGoogleCalendarUseCase;

