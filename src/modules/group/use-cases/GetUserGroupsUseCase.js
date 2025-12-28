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

    // Return groups immediately without blocking on Firebase
    // Mobile clients fetch Firebase data directly, so we don't need to include it
    const groupsData = groups.map(group => group.toJSON());

    // Fetch Firebase data in background (non-blocking) for potential caching/web clients
    // Fire-and-forget approach - don't await, don't block response
    Promise.all(
      groups.map(async group => {
        try {
          await this.firebaseAdapter.getGroupSnapshot(group.id);
          // Could cache here if needed for web clients
        } catch (error) {
          // Silently fail - Firebase data is optional and mobile handles it
          console.debug('Background Firebase fetch failed for group:', group.id, error.message);
        }
      })
    ).catch(err => {
      // Prevent unhandled promise rejection
      console.debug('Background Firebase fetch error:', err.message);
    });

    return groupsData;
  }
}

module.exports = GetUserGroupsUseCase;

