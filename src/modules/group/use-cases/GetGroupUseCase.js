/**
 * Get Group Use Case
 * Application layer - use case
 */

const { GroupNotFoundError, GroupAccessDeniedError } = require('../errors');

class GetGroupUseCase {
  constructor({
    groupRepository,
    firebaseAdapter
  }) {
    this.groupRepository = groupRepository;
    this.firebaseAdapter = firebaseAdapter;
  }

  async execute(groupId, userId) {
    const group = await this.groupRepository.findById(groupId);

    if (!group) {
      throw new GroupNotFoundError();
    }

    if (!group.isMember(userId)) {
      throw new GroupAccessDeniedError();
    }

    // Get Firebase data
    let fbGroup = null;
    try {
      fbGroup = await this.firebaseAdapter.getGroupSnapshot(groupId);
    } catch (error) {
      console.warn('Failed to fetch Firebase data for group:', error);
    }

    return {
      ...group.toJSON(),
      lastMessage: fbGroup?.lastMessage || null,
      lastActiveAt: fbGroup?.updatedAt || group.updatedAt
    };
  }
}

module.exports = GetGroupUseCase;

