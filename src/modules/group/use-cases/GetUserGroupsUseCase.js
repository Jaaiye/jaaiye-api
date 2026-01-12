/**
 * Get User Groups Use Case
 * Application layer - use case
 */

class GetUserGroupsUseCase {
  constructor({
    groupRepository,
    firebaseAdapter,
    friendshipRepository
  }) {
    this.groupRepository = groupRepository;
    this.firebaseAdapter = firebaseAdapter;
    this.friendshipRepository = friendshipRepository;
  }

  async execute(userId, includeInactive = false) {
    const groups = await this.groupRepository.findByUser(userId, includeInactive);
    const friends = await this.friendshipRepository.getFriends(userId);

    // Return groups immediately without blocking on Firebase
    // Mobile clients fetch Firebase data directly, so we don't need to include it
    const groupsData = groups.map(group => group.toJSON());
    const friendsData = this._mapFriendsFromFriendships(friends, userId);

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

    return { groups: groupsData, friends: friendsData };
  }

  /**
     * Map friendships to friend objects
     * @private
     * @param {Array} friendships - Friendship records
     * @param {string} userId - Current user ID
     * @returns {Array} Mapped friends data
     */
  _mapFriendsFromFriendships(friendships, userId) {
    return friendships.map((friendship) => {
      // Determine which user is the friend
      const isUser1 = friendship.user1.toString() === userId.toString();
      const friendData = isUser1
        ? friendship._populatedUser2
        : friendship._populatedUser1;

      // Fallback: if populated data not available, construct minimal object
      if (!friendData) {
        const friendId = friendship.getOtherUser(userId);
        return {
          id: friendId.toString(),
          friendshipId: friendship.id,
          addedAt: friendship.createdAt
        };
      }

      return {
        id: friendData.id,
        username: friendData.username,
        fullName: friendData.fullName,
        profilePicture: friendData.profilePicture,
        email: friendData.email,
        friendshipId: friendship.id,
        addedAt: friendship.createdAt
      };
    });
  }
}

module.exports = GetUserGroupsUseCase;

