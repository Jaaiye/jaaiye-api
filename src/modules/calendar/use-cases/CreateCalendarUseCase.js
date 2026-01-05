/**
 * Create Calendar Use Case
 * Application layer - use case
 */

const { CalendarAlreadyExistsError } = require('../errors');

class CreateCalendarUseCase {
  constructor({ calendarRepository }) {
    this.calendarRepository = calendarRepository;
  }

  /**
   * Execute create calendar
   * @param {string} ownerId - Owner user ID
   * @param {Object} data - Calendar data
   * @param {string} data.name - Calendar name
   * @param {string} data.description - Calendar description
   * @param {string} data.color - Calendar color
   * @param {boolean} data.isPublic - Is calendar public
   * @returns {Promise<Object>} Created calendar
   */
  async execute(ownerId, data) {
    // Check if user already has a calendar
    const hasCalendar = await this.calendarRepository.userHasCalendar(ownerId);
    if (hasCalendar) {
      throw new CalendarAlreadyExistsError();
    }

    const calendar = await this.calendarRepository.create({
      owner: ownerId,
      name: data.name,
      description: data.description,
      color: data.color,
      isPublic: data.isPublic !== undefined ? data.isPublic : false,
      isDefault: true
    });

    return { calendar: calendar.toObject() };
  }
}

module.exports = CreateCalendarUseCase;

