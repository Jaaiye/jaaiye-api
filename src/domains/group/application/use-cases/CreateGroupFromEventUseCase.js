/**
 * Create Group From Event Use Case
 * Application layer - use case
 */

const { GroupNotFoundError, GroupAccessDeniedError } = require('../../domain/errors');
const { EventNotFoundError, EventAccessDeniedError } = require('../../../event/domain/errors');

class CreateGroupFromEventUseCase {
  constructor({
    groupRepository,
    eventRepository,
    eventParticipantRepository,
    userRepository,
    firebaseAdapter,
    notificationAdapter
  }) {
    this.groupRepository = groupRepository;
    this.eventRepository = eventRepository;
    this.eventParticipantRepository = eventParticipantRepository;
    this.userRepository = userRepository;
    this.firebaseAdapter = firebaseAdapter;
    this.notificationAdapter = notificationAdapter;
  }

  async execute(userId, eventId, groupName) {
    // Get event
    const event = await this.eventRepository.findById(eventId);
    if (!event) {
      throw new EventNotFoundError();
    }

    // Check if user is participant
    const participant = await this.eventParticipantRepository.findByEventAndUser(eventId, userId);
    if (!participant) {
      throw new EventAccessDeniedError('You must be a participant in the event to create a group from it');
    }

    // Create group from event
    const group = await this.groupRepository.createFromEvent(eventId, groupName, userId);

    // Sync to Firebase (non-blocking)
    setImmediate(async () => {
      try {
        const plainMembers = {};
        for (const member of group.members) {
          if (member.user) {
            const memberUserId = typeof member.user === 'object' ? member.user.id || member.user._id : member.user;
            const user = await this.userRepository.findById(memberUserId);
            if (user) {
              plainMembers[memberUserId.toString()] = {
                name: String(user.fullName || user.username || 'Unknown User'),
                avatar: String(user.profilePicture || ''),
                role: String(member.role || 'member')
              };
            }
          }
        }

        await this.firebaseAdapter.createGroup(group.id, {
          name: group.name,
          description: group.description || '',
          creator: userId,
          members: plainMembers
        });
      } catch (error) {
        console.error('Failed to sync group to Firebase:', error);
      }
    });

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
            return this.notificationAdapter.send(memberUserId, {
              title: 'Added to Group',
              body: `You've been added to the group "${group.name}" created from event "${event.title || 'Event'}"`
            }, {
              type: 'group_member_added',
              groupId: group.id,
              eventId
            });
          })
      );
      } catch (error) {
        console.error('Failed to send notifications:', error);
      }
    });

    return group.toJSON();
  }
}

module.exports = CreateGroupFromEventUseCase;

