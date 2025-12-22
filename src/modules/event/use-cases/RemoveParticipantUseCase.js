/**
 * Remove Participant Use Case
 * Application layer - use case
 */

const { EventNotFoundError, EventAccessDeniedError, ParticipantNotFoundError } = require('../errors');

class RemoveParticipantUseCase {
  constructor({
    eventRepository,
    calendarRepository,
    eventParticipantRepository,
    notificationAdapter
  }) {
    this.eventRepository = eventRepository;
    this.calendarRepository = calendarRepository;
    this.eventParticipantRepository = eventParticipantRepository;
    this.notificationAdapter = notificationAdapter;
  }

  async execute(eventId, userId, targetUserId) {
    const event = await this.eventRepository.findById(eventId);
    if (!event) {
      throw new EventNotFoundError();
    }

    // Check access (only calendar owner or shared users can remove)
    const calendar = await this.calendarRepository.findById(event.calendar);
    if (!calendar) {
      throw new EventNotFoundError();
    }

    if (!calendar.isOwnedBy(userId) && !calendar.isSharedWith(userId)) {
      throw new EventAccessDeniedError('You do not have permission to remove participants from this event');
    }

    // Check if participant exists
    const participant = await this.eventParticipantRepository.findByEventAndUser(eventId, targetUserId);
    if (!participant) {
      throw new ParticipantNotFoundError('User is not a participant in this event');
    }

    // Delete participant
    await this.eventParticipantRepository.deleteByEventAndUser(eventId, targetUserId);

    // Notify removed participant
    await this.notificationAdapter.send(targetUserId, {
      title: 'Removed from Event',
      body: `You have been removed from the event "${event.title}"`
    }, {
      type: 'event_removal',
      eventId: event.id
    });

    return { success: true };
  }
}

module.exports = RemoveParticipantUseCase;

