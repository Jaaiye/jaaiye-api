/**
 * Remove Member Use Case
 * Application layer - use case
 */

const { GroupNotFoundError, GroupAccessDeniedError, CannotRemoveCreatorError } = require('../errors');

class RemoveMemberUseCase {
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

  async execute(groupId, currentUserId, memberId) {
    const group = await this.groupRepository.findById(groupId);

    if (!group) {
      throw new GroupNotFoundError();
    }

    if (!group.isAdmin(currentUserId) && currentUserId.toString() !== memberId.toString()) {
      throw new GroupAccessDeniedError('You can only remove yourself or be an admin');
    }

    const wasAdmin = group.isAdmin(memberId);

    try {
      let updatedGroupEntity = await this.groupRepository.removeMember(groupId, memberId);

      // Check if we need to promote a new admin
      // Only if the removed person was an admin AND no admins remain AND there are members left
      const remainingAdmins = updatedGroupEntity.members.filter(m => m.role === 'admin');

      if (wasAdmin && remainingAdmins.length === 0 && updatedGroupEntity.members.length > 0) {
        // Pick a random member to promote
        const randomIndex = Math.floor(Math.random() * updatedGroupEntity.members.length);
        const newAdminMemberInfo = updatedGroupEntity.members[randomIndex];
        const newAdminId = newAdminMemberInfo.user?._id || newAdminMemberInfo.user?.id || newAdminMemberInfo.user;

        if (newAdminId) {
          console.log(`[RemoveMember] Promoting user ${newAdminId} to admin for group ${groupId}`);
          updatedGroupEntity = await this.groupRepository.updateMemberRole(groupId, newAdminId, 'admin');

          // Sync to Firebase and send promotion notification (non-blocking)
          setImmediate(async () => {
            try {
              // Fetch full user details for Firebase sync
              const newAdminUser = await this.userRepository.findById(newAdminId);
              if (newAdminUser) {
                await this.firebaseAdapter.addMember(groupId, {
                  id: newAdminId.toString(),
                  name: newAdminUser.fullName || newAdminUser.username || 'Admin',
                  avatar: newAdminUser.profilePicture || '',
                  role: 'admin'
                });
              }

              await this.notificationAdapter.send(newAdminId, {
                title: 'Promoted to Admin',
                body: `You've been promoted to admin of the group "${group.name}" because the previous admin left.`
              }, {
                type: 'group_member_added',
                role: 'admin',
                groupName: group.name,
                groupId: group.id,
                eventId: group.eventId,
                path: `chatScreen`
              });
            } catch (error) {
              console.error('[RemoveMember] Failed to handle admin promotion sync/notification:', error);
            }
          });
        }
      }

      // Run background tasks (Firebase sync, Notifications, WebSockets)
      setImmediate(async () => {
        try {
          const { sendToUser, sendToGroup } = require('../../../utils/socket');

          // 1. Sync to Firebase
          await this.firebaseAdapter.removeMember(groupId, memberId);

          // 2. Send Push Notification
          await this.notificationAdapter.send(memberId, {
            title: 'Removed from Group',
            body: currentUserId.toString() === memberId.toString()
              ? `You've left the group "${group.name}"`
              : `You've been removed from the group "${group.name}"`
          }, {
            type: 'GROUP_MEMBER_REMOVED',
            groupId: group.id
          });

          // 3. WebSocket Notification (Personal)
          sendToUser(memberId, 'GROUP_MEMBER_REMOVED', {
            groupId: group.id,
            groupName: group.name,
            reason: currentUserId.toString() === memberId.toString() ? 'leave' : 'remove'
          });

          // 4. WebSocket Notification (Group-wide)
          sendToGroup(groupId, 'GROUP_MEMBER_REMOVED', {
            groupId: group.id,
            userId: memberId,
            count: updatedGroupEntity.members.length
          });

        } catch (error) {
          console.error('[RemoveMember] Background tasks error:', error);
        }
      });

      return updatedGroupEntity.toJSON();
    } catch (error) {
      if (error.message.includes('Cannot remove the group creator')) {
        throw new CannotRemoveCreatorError();
      }
      throw error;
    }
  }
}

module.exports = RemoveMemberUseCase;

