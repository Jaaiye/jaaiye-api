/**
 * Delete Calendar Use Case
 * Application layer - use case
 */

const { CalendarNotFoundError, CalendarEditDeniedError } = require('../errors');

class DeleteCalendarUseCase {
  constructor({ calendarRepository, eventRepository }) {
    this.calendarRepository = calendarRepository;
    this.eventRepository = eventRepository;
  }

  /**
   * Execute delete calendar
   * @param {string} calendarId - Calendar ID
   * @param {string} userId - Current user ID
   * @returns {Promise<void>}
   */
  async execute(calendarId, userId) {
    const calendar = await this.calendarRepository.findById(calendarId);
    if (!calendar) {
      throw new CalendarNotFoundError();
    }

    if (!calendar.isOwnedBy(userId)) {
      throw new CalendarEditDeniedError('Only calendar owner can delete calendar');
    }

    // Delete all events in this calendar
    const EventSchema = require('../../event/schemas/event.schema');
    await EventSchema.deleteMany({ calendar: calendarId });

    // Delete calendar
    await this.calendarRepository.delete(calendarId);
  }
}

module.exports = DeleteCalendarUseCase;

