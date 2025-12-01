/**
 * Delete Group Use Case
 * Application layer - use case
 */

const { GroupNotFoundError, GroupAccessDeniedError } = require('../../domain/errors');

class DeleteGroupUseCase {
  constructor({
    groupRepository,
    eventRepository,
    eventParticipantRepository,
    firebaseAdapter,
    notificationAdapter
  }) {
    this.groupRepository = groupRepository;
    this.eventRepository = eventRepository;
    this.eventParticipantRepository = eventParticipantRepository;
    this.firebaseAdapter = firebaseAdapter;
    this.notificationAdapter = notificationAdapter;
  }

  async execute(groupId, userId) {
    const group = await this.groupRepository.findById(groupId);

    if (!group) {
      throw new GroupNotFoundError();
    }

    if (group.creator.toString() !== userId.toString()) {
      throw new GroupAccessDeniedError('Only the creator can delete the group');
    }

    // Delete associated events if any
    if (group.events && group.events.length > 0) {
      const eventIds = group.events.map(e => typeof e === 'object' ? e.id || e._id : e);

      // Get all participants for these events and delete them
      const EventParticipantSchema = require('../../../event/infrastructure/persistence/schemas/EventParticipant.schema');
      await EventParticipantSchema.deleteMany({ event: { $in: eventIds } });

      // Delete events
      const EventSchema = require('../../../event/infrastructure/persistence/schemas/Event.schema');
      await EventSchema.deleteMany({ _id: { $in: eventIds } });
    }

    // Soft delete group
    await this.groupRepository.delete(groupId);

    // Sync to Firebase (non-blocking)
    setImmediate(async () => {
      try {
        await this.firebaseAdapter.deleteGroup(groupId);
      } catch (error) {
        console.error('Failed to delete group from Firebase:', error);
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
                title: 'Group Deleted',
                body: `The group "${group.name}" has been deleted`
              }, {
                type: 'group_deleted',
                groupId: group.id
              });
            })
        );
      } catch (error) {
        console.error('Failed to send notifications:', error);
      }
    });

    return { message: 'Group deleted successfully' };
  }
}

module.exports = DeleteGroupUseCase;

