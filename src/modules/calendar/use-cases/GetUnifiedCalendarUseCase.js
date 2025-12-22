/**
 * Get Unified Calendar Use Case
 * Application layer - use case
 * Combines Jaaiye and Google Calendar events
 */

const { ValidationError } = require('../errors');

class GetUnifiedCalendarUseCase {
  constructor({ calendarService }) {
    this.calendarService = calendarService;
  }

  /**
   * Execute get unified calendar
   * @param {string} userId - User ID
   * @param {string} timeMin - ISO string
   * @param {string} timeMax - ISO string
   * @param {Object} options - Options
   * @param {boolean} options.includeJaaiye - Include Jaaiye events
   * @param {boolean} options.includeGoogle - Include Google events
   * @param {string} options.viewType - View type
   * @returns {Promise<Object>} Unified calendar data
   */
  async execute(userId, timeMin, timeMax, options = {}) {
    const {
      includeJaaiye = true,
      includeGoogle = true,
      viewType = 'monthly'
    } = options;

    if (!timeMin || !timeMax) {
      throw new ValidationError('timeMin and timeMax are required (ISO strings)');
    }

    const calendarData = await this.calendarService.getUnifiedCalendar(
      userId,
      timeMin,
      timeMax,
      { includeJaaiye, includeGoogle, viewType }
    );

    return calendarData;
  }
}

module.exports = GetUnifiedCalendarUseCase;

