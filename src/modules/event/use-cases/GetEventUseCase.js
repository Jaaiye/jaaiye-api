/**
 * Get Event Use Case
 * Application layer - use case
 */

const { EventNotFoundError, EventAccessDeniedError } = require('../errors');

class GetEventUseCase {
  constructor({ eventRepository, calendarRepository }) {
    this.eventRepository = eventRepository;
    this.calendarRepository = calendarRepository;
  }

  async execute(eventId, userId = null) {
    // Try to find by ID first, then by slug
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(eventId);
    let event;

    if (isObjectId) {
      event = await this.eventRepository.findById(eventId);
    } else {
      event = await this.eventRepository.findBySlug(eventId);
    }

    if (!event) {
      throw new EventNotFoundError();
    }

    // Check access if user is provided
    if (userId) {
      const calendar = await this.calendarRepository.findById(event.calendar);
      if (!calendar) {
        throw new EventNotFoundError();
      }

      if (!calendar.isPublic && !calendar.isOwnedBy(userId) && !calendar.isSharedWith(userId)) {
        throw new EventAccessDeniedError();
      }
    }

    return event.toJSON();
  }
}

module.exports = GetEventUseCase;

