/**
 * Create Group Use Case
 * Application layer - use case
 */

const { UserAlreadyMemberError } = require('../errors');

class CreateGroupUseCase {
  constructor({
    groupRepository,
    userRepository,
    firebaseAdapter,
    notificationAdapter,
    walletRepository
  }) {
    this.groupRepository = groupRepository;
    this.userRepository = userRepository;
    this.firebaseAdapter = firebaseAdapter;
    this.notificationAdapter = notificationAdapter;
    this.walletRepository = walletRepository;
  }

  async execute(userId, dto) {
    // Create group
    const group = await this.groupRepository.create({
      name: dto.name,
      description: dto.description,
      creator: userId
    });

    // Create wallet for group (used by hangouts under this group)
    if (this.walletRepository) {
      try {
        const existingWallet = await this.walletRepository.findByOwner('GROUP', group.id);
        if (!existingWallet) {
          await this.walletRepository.create({
            ownerType: 'GROUP',
            ownerId: group.id,
            balance: 0.0,
            currency: 'NGN'
          });
        }
      } catch (walletError) {
        // ⚠️ Warning: wallet creation failed, but group creation succeeded
        // 💡 Suggestion: monitor logs to ensure wallet sync issues are handled
        console.error('Failed to create wallet for group', { groupId: group.id, error: walletError.message });
      }
    }

    // Add members if provided
    if (dto.memberIds.length > 0) {
      for (const memberId of dto.memberIds) {
        try {
          await this.groupRepository.addMember(group.id, memberId, userId, 'member');
        } catch (error) {
          if (error.message.includes('already a member')) {
            throw new UserAlreadyMemberError();
          }
          throw error;
        }
      }
    }

    // Get populated group
    const populatedGroup = await this.groupRepository.findById(group.id);

    // Sync to Firebase (non-blocking)
    setImmediate(async () => {
      try {
        const plainMembers = {};
        for (const member of populatedGroup.members) {
          if (member.user) {
            const userId = typeof member.user === 'object' ? member.user.id || member.user._id : member.user;
            const user = await this.userRepository.findById(userId);
            if (user) {
              plainMembers[userId.toString()] = {
                name: String(user.fullName || user.username || 'Unknown User'),
                avatar: String(user.profilePicture || ''),
                role: String(member.role || 'member')
              };
            }
          }
        }

        await this.firebaseAdapter.createGroup(populatedGroup.id, {
          name: populatedGroup.name,
          description: populatedGroup.description || '',
          creator: userId,
          members: plainMembers
        });
      } catch (error) {
        console.error('Failed to sync group to Firebase:', error);
      }
    });

    // Send notifications & WebSockets (non-blocking)
    if (dto.memberIds.length > 0) {
      setImmediate(async () => {
        try {
          const { sendToUser } = require('../../../utils/socket');

          await Promise.all(
            dto.memberIds.map(async (memberId) => {
              // 1. Push Notification
              await this.notificationAdapter.send(memberId, {
                title: 'Added to Group',
                body: `You've been added to the group "${group.name}"`
              }, {
                type: 'GROUP_MEMBER_ADDED',
                groupName: group.name,
                groupId: group.id,
                eventId: group.eventId,
                count: populatedGroup.members.length,
                path: `chatScreen`
              });

              // 2. WebSocket Notification
              sendToUser(memberId, 'GROUP_MEMBER_ADDED', {
                groupId: group.id,
                groupName: group.name,
                eventId: group.eventId,
                userId: memberId,
                count: populatedGroup.members.length,
                path: `chatScreen`
              });
            })
          );
        } catch (error) {
          console.error('CreateGroup background notifications error:', error);
        }
      });
    }

    return populatedGroup.toJSON();
  }
}

module.exports = CreateGroupUseCase;

