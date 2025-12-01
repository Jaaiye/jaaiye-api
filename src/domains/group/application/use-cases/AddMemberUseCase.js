/**
 * Add Member Use Case
 * Application layer - use case
 */

const { GroupNotFoundError, GroupAccessDeniedError, UserAlreadyMemberError } = require('../../domain/errors');
const { UserNotFoundError } = require('../../../shared/domain/errors');

class AddMemberUseCase {
  constructor({
    groupRepository,
    userRepository,
    firebaseAdapter,
    notificationAdapter
  }) {
    this.groupRepository = groupRepository;
    this.userRepository = userRepository;
    this.firebaseAdapter = firebaseAdapter;
    this.notificationAdapter = notificationAdapter;
  }

  async execute(groupId, userId, memberId, role = 'member') {
    const group = await this.groupRepository.findById(groupId);

    if (!group) {
      throw new GroupNotFoundError();
    }

    if (!group.canAddMembers(userId)) {
      throw new GroupAccessDeniedError('You do not have permission to add members');
    }

    const userToAdd = await this.userRepository.findById(memberId);
    if (!userToAdd) {
      throw new UserNotFoundError();
    }

    try {
      const updatedGroup = await this.groupRepository.addMember(groupId, memberId, userId, role);

      // Sync to Firebase (non-blocking)
      setImmediate(async () => {
        try {
          await this.firebaseAdapter.addMember(groupId, {
            id: memberId,
            name: userToAdd.fullName || userToAdd.username,
            avatar: userToAdd.profilePicture || '',
            role
          });
        } catch (error) {
          console.error('Failed to add member to Firebase:', error);
        }
      });

      // Send notification (non-blocking)
      setImmediate(async () => {
        try {
          await this.notificationAdapter.send(memberId, {
            title: 'Added to Group',
            body: `You've been added to the group "${group.name}"`
          }, {
            type: 'group_member_added',
            groupId: group.id
          });
        } catch (error) {
          console.error('Failed to send notification:', error);
        }
      });

      return updatedGroup.toJSON();
    } catch (error) {
      if (error.message.includes('already a member')) {
        throw new UserAlreadyMemberError();
      }
      throw error;
    }
  }
}

module.exports = AddMemberUseCase;

