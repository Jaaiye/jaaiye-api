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
    notificationAdapter,
    groupRepository,
    userRepository,
    firebaseAdapter
  }) {
    this.eventRepository = eventRepository;
    this.eventParticipantRepository = eventParticipantRepository;
    this.calendarRepository = calendarRepository;
    this.notificationAdapter = notificationAdapter;
    this.groupRepository = groupRepository;
    this.userRepository = userRepository;
    this.firebaseAdapter = firebaseAdapter;
  }

  async execute(eventId, userId, status) {
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

    const participant = await this.eventParticipantRepository.findByEventAndUser(event._id || event.id, userId);
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
      const eventDoc = await EventSchema.findById(event._id || event.id).select('slug').lean();
      const eventSlug = eventDoc?.slug || event.id;

      await this.notificationAdapter.send(calendar.owner, {
        title: 'Participant Status Update',
        body: `A participant has updated their status to "${status}" for event "${event.title}"`
      }, {
        type: 'participant_status_update',
        eventId: event._id || event.id,
        userId: userId,
        status,
        slug: eventSlug,
        path: `hangoutScreen/${eventSlug}`
      });
    }

    // If status is 'accepted', ensure user is in the associated group
    if (status === 'accepted' && this.groupRepository) {
      try {
        const group = await this.groupRepository.findByEvent(event._id || event.id);
        if (group) {
          // Check if already a member
          const existingMemberIds = new Set(
            group.members.map(m => {
              const memberUserId = typeof m.user === 'object' ? m.user.id || m.user._id : m.user;
              return memberUserId?.toString ? memberUserId.toString() : String(memberUserId);
            })
          );

          const userIdStr = userId?.toString ? userId.toString() : String(userId);

          if (!existingMemberIds.has(userIdStr)) {
            const addedBy = calendar?.owner || userId; // Use owner or self if owner not found
            await this.groupRepository.addMember(group.id, userIdStr, addedBy, 'member');

            // Sync to Firebase (non-blocking)
            if (this.firebaseAdapter) {
              setImmediate(async () => {
                try {
                  const user = await this.userRepository.findById(userIdStr);
                  if (user) {
                    await this.firebaseAdapter.addMember(group.id, {
                      id: userIdStr,
                      name: user.fullName || user.username || 'Unknown User',
                      avatar: user.profilePicture || '',
                      role: 'member'
                    });
                  }
                } catch (error) {
                  console.error('[UpdateParticipantStatus] Failed to sync to Firebase:', error);
                }
              });
            }
          }
        }
      } catch (error) {
        console.warn('[UpdateParticipantStatus] Failed to sync participant to group:', error.message);
      }
    }

    return participant.toJSON();
  }
}

module.exports = UpdateParticipantStatusUseCase;

