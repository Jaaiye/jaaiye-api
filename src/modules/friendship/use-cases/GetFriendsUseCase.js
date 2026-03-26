/**
 * Get Friends Use Case
 * Application layer - use case
 */

class GetFriendsUseCase {
  constructor({ friendshipRepository }) {
    this.friendshipRepository = friendshipRepository;
  }

  /**
   * Execute get friends
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Friends list
   */
    async execute(userId) {
    const friendships = await this.friendshipRepository.getFriends(userId);

    const friends = friendships
      .map((friendship) => {
        // Safety check: if user1 or user2 is null (deleted user), return null
        if (!friendship.user1 || !friendship.user2) return null;

        // 1. friendship.user1 is already a string from _toEntity
const u1Id = friendship.user1?.toString();
const currentUserId = userId?.toString();

// 2. Compare strings directly
const isUser1 = u1Id === currentUserId;

// 3. Get the populated data we attached in _toEntity
const friendData = isUser1 
  ? friendship._populatedUser2 
  : friendship._populatedUser1;

        return {
          id: friendData._id || friendData,
          username: friendData.username || 'Deleted User',
          fullName: friendData.fullName || 'Deleted User',
          profilePicture: friendData.profilePicture,
          email: friendData.email,
          friendshipId: friendship.id,
          addedAt: friendship.createdAt
        };
      })
      .filter(f => f !== null); // This removes the empty slots from the list

    return { friends };
  }
}

module.exports = GetFriendsUseCase;


