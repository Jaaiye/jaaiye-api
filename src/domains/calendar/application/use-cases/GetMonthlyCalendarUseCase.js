/**
 * Get Monthly Calendar Use Case
 * Application layer - use case
 */

const { ValidationError } = require('../../../shared/domain/errors');

class GetMonthlyCalendarUseCase {
  constructor({ calendarService }) {
    this.calendarService = calendarService;
  }

  /**
   * Execute get monthly calendar
   * @param {string} userId - User ID
   * @param {number} year - Year
   * @param {number} month - Month (1-12)
   * @param {Object} options - Options
   * @param {boolean} options.includeJaaiye - Include Jaaiye events
   * @param {boolean} options.includeGoogle - Include Google events
   * @returns {Promise<Object>} Monthly calendar grid
   */
  async execute(userId, year, month, options = {}) {
    const { includeJaaiye = true, includeGoogle = true } = options;

    const yearNum = parseInt(year);
    const monthNum = parseInt(month);

    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      throw new ValidationError('Invalid year or month');
    }

    const monthlyGrid = await this.calendarService.getMonthlyCalendarGrid(
      userId,
      yearNum,
      monthNum,
      { includeJaaiye, includeGoogle }
    );

    return monthlyGrid;
  }
}

module.exports = GetMonthlyCalendarUseCase;

