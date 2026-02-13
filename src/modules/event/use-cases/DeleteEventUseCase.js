/**
 * Delete Event Use Case
 * Application layer - use case
 */

const { EventNotFoundError, EventAccessDeniedError } = require('../errors');

class DeleteEventUseCase {
  constructor({
    eventRepository,
    calendarRepository,
    userRepository,
    googleCalendarAdapter
  }) {
    this.eventRepository = eventRepository;
    this.calendarRepository = calendarRepository;
    this.userRepository = userRepository;
    this.googleCalendarAdapter = googleCalendarAdapter;
  }

  async execute(eventId, userId) {
    const event = await this.eventRepository.findByIdOrSlug(eventId);

    if (!event) {
      throw new EventNotFoundError();
    }

    // Check access
    const calendar = await this.calendarRepository.findById(event.calendar);
    if (!calendar) {
      throw new EventNotFoundError();
    }

    if (!calendar.isOwnedBy(userId) && !calendar.isSharedWith(userId) && !calendar.isPublic) {
      throw new EventAccessDeniedError();
    }

    // Delete from Google Calendar
    try {
      if (event.external?.google?.eventId) {
        const user = await this.userRepository.findById(userId);
        if (user && user.providerLinks?.google && user.googleCalendar?.refreshToken) {
          await this.googleCalendarAdapter.deleteEvent(
            user,
            event.external.google.calendarId,
            event.external.google.eventId
          );
        }
      }
    } catch (error) {
      console.warn('Google calendar sync failed during event deletion', error);
    }

    // Delete event
    await this.eventRepository.delete(event._id || event.id);

    return { success: true };
  }
}

module.exports = DeleteEventUseCase;

