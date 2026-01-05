/**
 * Search Users Use Case
 * Application layer - use case
 */

const { ValidationError } = require('../errors');
const UserSchema = require('../../common/entities/User.schema');
const { formatUserResponse } = require('../../../utils/response');

class SearchUsersUseCase {
  constructor({ userRepository, friendshipRepository, friendRequestRepository }) {
    this.userRepository = userRepository;
    this.friendshipRepository = friendshipRepository;
    this.friendRequestRepository = friendRequestRepository;
  }

  /**
   * Execute search users
   * @param {string} userId - Current user ID
   * @param {string} query - Search query
   * @param {number} limit - Result limit
   * @returns {Promise<Object>} Search results with friendship status
   */
  async execute(userId, query, limit = 20) {
    if (!query || query.trim().length < 2) {
      throw new ValidationError('Search query must be at least 2 characters long');
    }

    const searchRegex = new RegExp(query.trim(), 'i');

    // Search users
    const users = await UserSchema.find({
      $and: [
        { _id: { $ne: userId } },
        { isActive: true },
        { 'friendSettings.showInSearch': true },
        {
          $or: [
            { username: searchRegex },
            { fullName: searchRegex },
            { email: searchRegex }
          ]
        }
      ]
    })
      .select('username fullName profilePicture email')
      .limit(parseInt(limit));

    // Check friendship status for each user
    const usersWithStatus = await Promise.all(
      users.map(async (user) => {
        const friendship = await this.friendshipRepository.findFriendship(userId, user._id);
        const friendRequest = await this.friendRequestRepository.findPendingRequest(userId, user._id);

        return {
          ...formatUserResponse(user),
          friendshipStatus: friendship ? friendship.status : null,
          friendRequestStatus: friendRequest ? friendRequest.status : null,
          isFriend: friendship && friendship.isActive()
        };
      })
    );

    return { users: usersWithStatus };
  }
}

module.exports = SearchUsersUseCase;

