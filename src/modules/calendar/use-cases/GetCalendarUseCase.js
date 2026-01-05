/**
 * Get Calendar Use Case
 * Application layer - use case
 */

const { CalendarNotFoundError, CalendarAccessDeniedError } = require('../errors');

class GetCalendarUseCase {
  constructor({ calendarRepository }) {
    this.calendarRepository = calendarRepository;
  }

  /**
   * Execute get calendar
   * @param {string} calendarId - Calendar ID
   * @param {string} userId - Current user ID
   * @returns {Promise<Object>} Calendar
   */
  async execute(calendarId, userId) {
    const calendar = await this.calendarRepository.findById(calendarId);
    if (!calendar) {
      throw new CalendarNotFoundError();
    }

    if (!calendar.canBeAccessedBy(userId)) {
      throw new CalendarAccessDeniedError();
    }

    return { calendar: calendar.toObject() };
  }
}

module.exports = GetCalendarUseCase;

