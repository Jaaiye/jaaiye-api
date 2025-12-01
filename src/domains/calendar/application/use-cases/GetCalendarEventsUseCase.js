/**
 * Get Calendar Events Use Case
 * Application layer - use case
 */

const { CalendarNotFoundError, CalendarAccessDeniedError } = require('../../domain/errors');
const { buildEventQueryFilters } = require('../../../../utils/calendarHelpers');

class GetCalendarEventsUseCase {
  constructor({ calendarRepository, eventRepository }) {
    this.calendarRepository = calendarRepository;
    this.eventRepository = eventRepository;
  }

  /**
   * Execute get calendar events
   * @param {string} calendarId - Calendar ID
   * @param {string} userId - Current user ID
   * @param {Object} filters - Query filters
   * @returns {Promise<Object>} Events list
   */
  async execute(calendarId, userId, filters = {}) {
    const calendar = await this.calendarRepository.findById(calendarId);
    if (!calendar) {
      throw new CalendarNotFoundError();
    }

    if (!calendar.canBeAccessedBy(userId)) {
      throw new CalendarAccessDeniedError();
    }

    const query = buildEventQueryFilters(calendarId, filters);
    const result = await this.eventRepository.find(query, {
      limit: filters.limit || 100,
      skip: filters.skip || 0,
      sort: { startTime: 1 }
    });

    return {
      count: result.events.length,
      events: result.events.map(event => event.toJSON ? event.toJSON() : event)
    };
  }
}

module.exports = GetCalendarEventsUseCase;

