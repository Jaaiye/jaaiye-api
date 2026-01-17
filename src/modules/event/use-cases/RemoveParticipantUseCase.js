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
    notificationAdapter,
    groupRepository,
    firebaseAdapter
  }) {
    this.eventRepository = eventRepository;
    this.calendarRepository = calendarRepository;
    this.eventParticipantRepository = eventParticipantRepository;
    this.notificationAdapter = notificationAdapter;
    this.groupRepository = groupRepository;
    this.firebaseAdapter = firebaseAdapter;
  }

  async execute(eventId, userId, targetUserId) {
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

    // Check access (only calendar owner or shared users can remove)
    const calendar = await this.calendarRepository.findById(event.calendar);
    if (!calendar) {
      throw new EventNotFoundError();
    }

    if (!calendar.isOwnedBy(userId) && !calendar.isSharedWith(userId)) {
      throw new EventAccessDeniedError('You do not have permission to remove participants from this event');
    }

    // Check if participant exists
    const participant = await this.eventParticipantRepository.findByEventAndUser(event._id || event.id, targetUserId);
    if (!participant) {
      throw new ParticipantNotFoundError('User is not a participant in this event');
    }

    // Delete participant
    await this.eventParticipantRepository.deleteByEventAndUser(event._id || event.id, targetUserId);

    // Fetch event slug from schema (slug not in entity)
    const EventSchema = require('../entities/Event.schema');
    const eventDoc = await EventSchema.findById(event._id || event.id).select('slug').lean();
    const eventSlug = eventDoc?.slug || event.id;

    await this.notificationAdapter.send(targetUserId, {
      title: 'Removed from Event',
      body: `You have been removed from the event "${event.title}"`
    }, {
      type: 'event_removal',
      eventId: event._id || event.id,
      slug: eventSlug,
      path: `hangoutScreen/${eventSlug}`
    });

    // Remove from group if associated
    if (this.groupRepository) {
      try {
        const group = await this.groupRepository.findByEvent(event._id || event.id);
        if (group) {
          await this.groupRepository.removeMember(group.id, targetUserId);

          // Update Firebase sync (non-blocking)
          if (this.firebaseAdapter) {
            setImmediate(async () => {
              try {
                await this.firebaseAdapter.removeMember(group.id, targetUserId);
              } catch (error) {
                console.warn('[RemoveParticipant] Failed to remove member from Firebase:', group.id, targetUserId, error.message);
              }
            });
          }
        }
      } catch (error) {
        console.warn('[RemoveParticipant] Group member removal failed:', error.message);
      }
    }

    return { success: true };
  }
}

module.exports = RemoveParticipantUseCase;

