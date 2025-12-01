/**
 * Create Group Event Use Case
 * Application layer - use case
 */

const { GroupNotFoundError, GroupAccessDeniedError } = require('../../domain/errors');

class CreateGroupEventUseCase {
  constructor({
    groupRepository,
    eventRepository,
    eventParticipantRepository,
    calendarRepository,
    userRepository,
    notificationAdapter
  }) {
    this.groupRepository = groupRepository;
    this.eventRepository = eventRepository;
    this.eventParticipantRepository = eventParticipantRepository;
    this.calendarRepository = calendarRepository;
    this.userRepository = userRepository;
    this.notificationAdapter = notificationAdapter;
  }

  async execute(groupId, userId, eventData, participationMode = 'invite_only') {
    const group = await this.groupRepository.findById(groupId);

    if (!group) {
      throw new GroupNotFoundError();
    }

    if (!group.canCreateEvents(userId)) {
      throw new GroupAccessDeniedError('You do not have permission to create events for this group');
    }

    // Get user's calendar (required for event creation)
    // Group events use the creator's calendar
    const userCalendar = await this.calendarRepository.findByOwner(userId);
    if (!userCalendar) {
      throw new Error('User must have a calendar to create events');
    }

    // Create event
    const event = await this.eventRepository.create({
      calendar: userCalendar.id,
      title: eventData.title,
      description: eventData.description,
      startTime: eventData.startTime,
      endTime: eventData.endTime,
      venue: eventData.location,
      isAllDay: eventData.isAllDay || false,
      createdBy: userId
    });

    // Add creator as organizer
    await this.eventParticipantRepository.create({
      event: event.id,
      user: userId,
      role: 'organizer',
      status: 'accepted'
    });

    // Auto-add group members if participation mode is auto_add
    if (participationMode === 'auto_add') {
      const participantPromises = group.members
        .filter(member => {
          const memberUserId = typeof member.user === 'object' ? member.user.id || member.user._id : member.user;
          return memberUserId.toString() !== userId.toString();
        })
        .map(member => {
          const memberUserId = typeof member.user === 'object' ? member.user.id || member.user._id : member.user;
          return this.eventParticipantRepository.create({
            event: event.id,
            user: memberUserId,
            role: 'attendee',
            status: 'pending'
          });
        });

      await Promise.all(participantPromises);
    }

    // Add event to group
    await this.groupRepository.addEvent(groupId, event.id);

    // Send notifications (non-blocking)
    setImmediate(async () => {
      try {
        await Promise.all(
          group.members
            .filter(member => {
              const memberUserId = typeof member.user === 'object' ? member.user.id || member.user._id : member.user;
              return memberUserId.toString() !== userId.toString();
            })
            .map(member => {
              const memberUserId = typeof member.user === 'object' ? member.user.id || member.user._id : member.user;
              const notificationType = participationMode === 'auto_add'
                ? 'group_event_auto_added'
                : 'group_event_invitation';

              return this.notificationAdapter.send(memberUserId, {
                title: 'New Group Event',
                body: `A new event "${event.title}" has been created in group "${group.name}"`
              }, {
                type: notificationType,
                groupId: group.id,
                eventId: event.id
              });
            })
        );
      } catch (error) {
        console.error('Failed to send notifications:', error);
      }
    });

    // Get populated event
    const populatedEvent = await this.eventRepository.findById(event.id);

    return populatedEvent.toJSON();
  }
}

module.exports = CreateGroupEventUseCase;

