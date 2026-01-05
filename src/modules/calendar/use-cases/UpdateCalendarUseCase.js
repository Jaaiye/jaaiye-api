/**
 * Update Calendar Use Case
 * Application layer - use case
 */

const { CalendarNotFoundError, CalendarEditDeniedError } = require('../errors');

class UpdateCalendarUseCase {
  constructor({ calendarRepository }) {
    this.calendarRepository = calendarRepository;
  }

  /**
   * Execute update calendar
   * @param {string} calendarId - Calendar ID
   * @param {string} userId - Current user ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object>} Updated calendar
   */
  async execute(calendarId, userId, updates) {
    const calendar = await this.calendarRepository.findById(calendarId);
    if (!calendar) {
      throw new CalendarNotFoundError();
    }

    if (!calendar.canBeEditedBy(userId)) {
      throw new CalendarEditDeniedError();
    }

    const updateData = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.color !== undefined) updateData.color = updates.color;
    if (updates.isPublic !== undefined) updateData.isPublic = updates.isPublic;

    const updated = await this.calendarRepository.update(calendarId, updateData);
    return { calendar: updated.toObject() };
  }
}

module.exports = UpdateCalendarUseCase;

