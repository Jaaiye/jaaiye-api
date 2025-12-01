/**
 * Get Calendars Use Case
 * Application layer - use case
 */

class GetCalendarsUseCase {
  constructor({ calendarRepository }) {
    this.calendarRepository = calendarRepository;
  }

  /**
   * Execute get calendars
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Calendars list
   */
  async execute(userId) {
    const calendars = await this.calendarRepository.findAccessibleByUser(userId);
    return {
      calendars: calendars.map(cal => cal.toObject())
    };
  }
}

module.exports = GetCalendarsUseCase;

