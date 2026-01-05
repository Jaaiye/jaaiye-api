/**
 * Update Event Use Case
 * Application layer - use case
 */

const { EventNotFoundError, EventAccessDeniedError } = require('../errors');

class UpdateEventUseCase {
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

  async execute(eventId, userId, dto) {
    const event = await this.eventRepository.findById(eventId);
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

    // Build update data
    const updateData = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.startTime !== undefined) updateData.startTime = new Date(dto.startTime);
    if (dto.endTime !== undefined) updateData.endTime = new Date(dto.endTime);
    if (dto.venue !== undefined) updateData.venue = dto.venue;
    if (dto.isAllDay !== undefined) updateData.isAllDay = dto.isAllDay;
    if (dto.recurrence !== undefined) updateData.recurrence = dto.recurrence;
    if (dto.status !== undefined) updateData.status = dto.status;

    // Update event
    const updatedEvent = await this.eventRepository.update(eventId, updateData);

    // Sync with Google Calendar
    try {
      if (updatedEvent.external?.google?.eventId) {
        const user = await this.userRepository.findById(userId);
        if (user && user.providerLinks?.google && user.googleCalendar?.refreshToken) {
          const eventBody = {
            summary: updatedEvent.title,
            description: updatedEvent.description,
            start: { dateTime: new Date(updatedEvent.startTime).toISOString() },
            end: { dateTime: new Date(updatedEvent.endTime).toISOString() },
            location: updatedEvent.venue
          };

          await this.googleCalendarAdapter.updateEvent(
            user,
            updatedEvent.external.google.calendarId,
            updatedEvent.external.google.eventId,
            eventBody
          );
        }
      }
    } catch (error) {
      console.warn('Google calendar sync failed during event update', error);
    }

    return updatedEvent.toJSON();
  }
}

module.exports = UpdateEventUseCase;

