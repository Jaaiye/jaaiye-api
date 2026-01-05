/**
 * Remove Member Use Case
 * Application layer - use case
 */

const { GroupNotFoundError, GroupAccessDeniedError, CannotRemoveCreatorError } = require('../errors');

class RemoveMemberUseCase {
  constructor({
    groupRepository,
    firebaseAdapter,
    notificationAdapter
  }) {
    this.groupRepository = groupRepository;
    this.firebaseAdapter = firebaseAdapter;
    this.notificationAdapter = notificationAdapter;
  }

  async execute(groupId, currentUserId, memberId) {
    const group = await this.groupRepository.findById(groupId);

    if (!group) {
      throw new GroupNotFoundError();
    }

    if (!group.isAdmin(currentUserId) && currentUserId.toString() !== memberId.toString()) {
      throw new GroupAccessDeniedError('You can only remove yourself or be an admin');
    }

    try {
      const updatedGroup = await this.groupRepository.removeMember(groupId, memberId);

      // Sync to Firebase (non-blocking)
      setImmediate(async () => {
        try {
          await this.firebaseAdapter.removeMember(groupId, memberId);
        } catch (error) {
          console.error('Failed to remove member from Firebase:', error);
        }
      });

      // Send notification (non-blocking)
      setImmediate(async () => {
        try {
          await this.notificationAdapter.send(memberId, {
            title: 'Removed from Group',
            body: `You've been removed from the group "${group.name}"`
          }, {
            type: 'group_member_removed',
            groupId: group.id
          });
        } catch (error) {
          console.error('Failed to send notification:', error);
        }
      });

      return updatedGroup.toJSON();
    } catch (error) {
      if (error.message.includes('Cannot remove the group creator')) {
        throw new CannotRemoveCreatorError();
      }
      throw error;
    }
  }
}

module.exports = RemoveMemberUseCase;

