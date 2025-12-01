/**
 * Add Participants Use Case
 * Application layer - use case
 * Handles both single and multiple participants
 */

const { EventNotFoundError, EventAccessDeniedError, ParticipantAlreadyExistsError } = require('../../domain/errors');

class AddParticipantsUseCase {
  constructor({
    eventRepository,
    calendarRepository,
    eventParticipantRepository,
    userRepository,
    notificationAdapter,
    googleCalendarAdapter
  }) {
    this.eventRepository = eventRepository;
    this.calendarRepository = calendarRepository;
    this.eventParticipantRepository = eventParticipantRepository;
    this.userRepository = userRepository;
    this.notificationAdapter = notificationAdapter;
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

    if (!calendar.isOwnedBy(userId) && !calendar.isSharedWith(userId)) {
      throw new EventAccessDeniedError('You do not have permission to add participants to this event');
    }

    // Normalize participants
    const normalizedParticipants = dto.normalize();

    // Check for existing participants
    const userIds = normalizedParticipants.map(p => p.user);
    const existingParticipants = await Promise.all(
      userIds.map(userId => this.eventParticipantRepository.findByEventAndUser(eventId, userId))
    );

    const existingUserIds = new Set(
      existingParticipants.filter(p => p !== null).map(p => p.user.toString())
    );

    // Filter out existing participants
    const newParticipants = normalizedParticipants.filter(
      p => !existingUserIds.has(p.user.toString())
    );

    if (newParticipants.length === 0) {
      throw new ParticipantAlreadyExistsError('All users are already participants');
    }

    // Create participants
    const participantsData = newParticipants.map(p => ({
      event: eventId,
      user: p.user,
      role: p.role
    }));

    const createdParticipants = await this.eventParticipantRepository.createMany(participantsData);

    // Send notifications
    await Promise.all(
      createdParticipants.map(participant =>
        this.notificationAdapter.send(participant.user, {
          title: 'Event Invitation',
          body: `You have been invited to the event "${event.title}"`
        }, {
          type: 'event_invitation',
          eventId: event.id
        })
      )
    );

    // Add to Google Calendar for participants
    await Promise.all(
      createdParticipants.map(async (participant) => {
        try {
          const participantUser = await this.userRepository.findById(participant.user);
          if (participantUser && participantUser.providerLinks?.google && participantUser.googleCalendar?.refreshToken) {
            const eventBody = {
              summary: event.title,
              description: event.description || `You've been invited to ${event.title}`,
              start: { dateTime: new Date(event.startTime).toISOString() },
              end: { dateTime: new Date(event.endTime || event.startTime).toISOString() },
              location: event.venue || undefined
            };

            await this.googleCalendarAdapter.insertEvent(participantUser, eventBody);
          }
        } catch (error) {
          console.warn('Failed to add event to participant Google Calendar', error);
        }
      })
    );

    return createdParticipants.map(p => p.toJSON());
  }
}

module.exports = AddParticipantsUseCase;

