/**
 * Add Member Use Case
 * Application layer - use case
 */

const { GroupNotFoundError, GroupAccessDeniedError, UserAlreadyMemberError } = require('../errors');
const { UserNotFoundError } = require('../../common/errors');

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

      // Run background tasks (Firebase sync, Notifications, WebSockets)
      setImmediate(async () => {
        try {
          const { sendToUser, sendToGroup } = require('../../../utils/socket');

          // 1. Sync to Firebase
          await this.firebaseAdapter.addMember(groupId, {
            id: memberId,
            name: userToAdd.fullName || userToAdd.username,
            avatar: userToAdd.profilePicture || '',
            role
          });

          // 2. Send Push Notification
          await this.notificationAdapter.send(memberId, {
            title: 'Added to Group',
            body: `You've been added to the group "${group.name}"`
          }, {
            type: 'GROUP_MEMBER_ADDED',
            groupName: group.name,
            groupId: group.id,
            eventId: group.eventId,
            count: updatedGroup.members.length,
            path: `chatScreen`
          });

          // 3. Send WebSocket Notification (Personal)
          sendToUser(memberId, 'GROUP_MEMBER_ADDED', {
            groupId: group.id,
            groupName: group.name,
            eventId: group.eventId,
            userId: memberId,
            count: updatedGroup.members.length,
            path: `chatScreen`
          });

          // 4. Send WebSocket Notification (Group-wide)
          sendToGroup(groupId, 'GROUP_MEMBER_LIST_UPDATED', {
            groupId: group.id,
            userId: memberId,
            role,
            count: updatedGroup.members.length
          });

        } catch (error) {
          console.error('AddMember background task error:', error);
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

