/**
 * Link Google Calendars Use Case
 * Application layer - use case
 */

const { CalendarNotFoundError, CalendarEditDeniedError, InvalidGoogleCalendarMappingError } = require('../../domain/errors');
const { GoogleCalendarMappingVO } = require('../../domain/value-objects');

class LinkGoogleCalendarsUseCase {
  constructor({ calendarRepository }) {
    this.calendarRepository = calendarRepository;
  }

  /**
   * Execute link Google calendars
   * @param {string} calendarId - Jaaiye calendar ID
   * @param {string} userId - Current user ID
   * @param {Array<string>} linkedIds - Google calendar IDs to link
   * @returns {Promise<Object>} Google mapping
   */
  async execute(calendarId, userId, linkedIds) {
    if (!Array.isArray(linkedIds)) {
      throw new InvalidGoogleCalendarMappingError('linkedIds must be an array');
    }

    const calendar = await this.calendarRepository.findById(calendarId);
    if (!calendar) {
      throw new CalendarNotFoundError();
    }

    if (!calendar.isOwnedBy(userId)) {
      throw new CalendarEditDeniedError();
    }

    // Sanitize linkedIds
    const sanitized = linkedIds.filter(id => typeof id === 'string' && id.trim().length > 0);

    // Create value object for validation
    const googleMapping = new GoogleCalendarMappingVO({
      linkedIds: sanitized,
      primaryId: calendar.google?.primaryId || null
    });

    // If primaryId exists but not in new linkedIds, clear it
    if (googleMapping.primaryId && !sanitized.includes(googleMapping.primaryId)) {
      googleMapping.clearPrimary();
    }

    // Update calendar
    const updated = await this.calendarRepository.update(calendarId, {
      'google.linkedIds': googleMapping.linkedIds,
      'google.primaryId': googleMapping.primaryId
    });

    return { google: updated.google };
  }
}

module.exports = LinkGoogleCalendarsUseCase;

