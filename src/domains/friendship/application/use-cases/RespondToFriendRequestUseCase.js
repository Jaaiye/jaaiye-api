/**
 * Respond to Friend Request Use Case
 * Application layer - use case
 */

const { BadRequestError } = require('../../../shared/domain/errors');
const { FriendRequestNotFoundError, FriendRequestExpiredError, InvalidFriendRequestActionError } = require('../../domain/errors');

class RespondToFriendRequestUseCase {
  constructor({ userRepository, friendshipRepository, friendRequestRepository, notificationAdapter }) {
    this.userRepository = userRepository;
    this.friendshipRepository = friendshipRepository;
    this.friendRequestRepository = friendRequestRepository;
    this.notificationAdapter = notificationAdapter;
  }

  /**
   * Execute respond to friend request
   * @param {string} userId - Current user ID
   * @param {string} requestId - Friend request ID
   * @param {string} action - 'accept' or 'decline'
   * @returns {Promise<Object>} Result
   */
  async execute(userId, requestId, action) {
    if (!['accept', 'decline'].includes(action)) {
      throw new InvalidFriendRequestActionError('Action must be either "accept" or "decline"');
    }

    const friendRequest = await this.friendRequestRepository.findById(requestId);
    if (!friendRequest) {
      throw new FriendRequestNotFoundError();
    }

    // Check if user is the recipient
    if (!friendRequest.isRecipient(userId)) {
      throw new BadRequestError('You can only respond to friend requests sent to you');
    }

    if (!friendRequest.isPending()) {
      throw new BadRequestError('Friend request has already been processed');
    }

    if (friendRequest.isExpired()) {
      throw new FriendRequestExpiredError();
    }

    if (action === 'accept') {
      // Create friendship
      const friendship = await this.friendshipRepository.create(
        friendRequest.requester,
        friendRequest.recipient,
        friendRequest.requester
      );

      // Update friend request status
      await this.friendRequestRepository.updateStatus(requestId, 'accepted');

      // Send notification to requester
      const recipient = await this.userRepository.findById(userId);
      if (this.notificationAdapter) {
        this.notificationAdapter.send(friendRequest.requester, {
          title: 'Friend Request Accepted',
          body: `${recipient.username || recipient.fullName} accepted your friend request`
        }, {
          type: 'friend_request_accepted',
          friendshipId: friendship.id
        }).catch(err => console.error('Failed to send notification:', err));
      }

      return { friendshipId: friendship.id };
    } else {
      // Decline
      await this.friendRequestRepository.updateStatus(requestId, 'declined');
      return null;
    }
  }
}

module.exports = RespondToFriendRequestUseCase;

