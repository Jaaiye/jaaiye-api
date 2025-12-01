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

    const friends = friendships.map((friendship) => {
      // Get the other user's data from populated fields
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

    return { friends };
  }
}

module.exports = GetFriendsUseCase;


