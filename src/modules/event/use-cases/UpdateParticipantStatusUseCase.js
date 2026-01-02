/**
 * Update Participant Status Use Case
 * Application layer - use case
 */

const { EventNotFoundError, ParticipantNotFoundError } = require('../errors');

class UpdateParticipantStatusUseCase {
  constructor({
    eventRepository,
    eventParticipantRepository,
    calendarRepository,
    notificationAdapter
  }) {
    this.eventRepository = eventRepository;
    this.eventParticipantRepository = eventParticipantRepository;
    this.calendarRepository = calendarRepository;
    this.notificationAdapter = notificationAdapter;
  }

  async execute(eventId, userId, status) {
    const event = await this.eventRepository.findById(eventId);
    if (!event) {
      throw new EventNotFoundError();
    }

    const participant = await this.eventParticipantRepository.findByEventAndUser(eventId, userId);
    if (!participant) {
      throw new ParticipantNotFoundError('You are not a participant in this event');
    }

    // Update status
    participant.updateStatus(status);
    await this.eventParticipantRepository.update(participant.id, {
      status: participant.status,
      responseTime: participant.responseTime
    });

    // Notify event creator
    const calendar = await this.calendarRepository.findById(event.calendar);
    if (calendar && calendar.owner) {
      // Fetch event slug from schema (slug not in entity)
      const EventSchema = require('../entities/Event.schema');
      const eventDoc = await EventSchema.findById(eventId).select('slug').lean();
      const eventSlug = eventDoc?.slug || event.id;

      await this.notificationAdapter.send(calendar.owner, {
        title: 'Participant Status Update',
        body: `A participant has updated their status to "${status}" for event "${event.title}"`
      }, {
        type: 'participant_status_update',
        eventId: event.id,
        userId: userId,
        status,
        slug: eventSlug,
        path: `hangoutScreen/${eventSlug}`
      });
    }

    return participant.toJSON();
  }
}

module.exports = UpdateParticipantStatusUseCase;

