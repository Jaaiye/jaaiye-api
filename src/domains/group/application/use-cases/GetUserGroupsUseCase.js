/**
 * Get User Groups Use Case
 * Application layer - use case
 */

class GetUserGroupsUseCase {
  constructor({
    groupRepository,
    firebaseAdapter
  }) {
    this.groupRepository = groupRepository;
    this.firebaseAdapter = firebaseAdapter;
  }

  async execute(userId, includeInactive = false) {
    const groups = await this.groupRepository.findByUser(userId, includeInactive);

    // Enrich with Firebase data
    const enrichedGroups = await Promise.all(
      groups.map(async group => {
        try {
          const fbData = await this.firebaseAdapter.getGroupSnapshot(group.id);
          return {
            ...group.toJSON(),
            lastMessage: fbData?.lastMessage || null,
            updatedAtFirebase: fbData?.updatedAt || null
          };
        } catch (error) {
          console.warn('Failed to fetch Firebase data for group:', error);
          return {
            ...group.toJSON(),
            lastMessage: null,
            updatedAtFirebase: null
          };
        }
      })
    );

    return enrichedGroups;
  }
}

module.exports = GetUserGroupsUseCase;

