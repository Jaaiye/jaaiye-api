/**
 * Send Friend Request Use Case
 * Application layer - use case
 */

const { NotFoundError, BadRequestError } = require('../../../utils/errors');
const { FriendRequestsNotAllowedError, FriendRequestAlreadyExistsError, FriendshipAlreadyExistsError } = require('../errors');

class SendFriendRequestUseCase {
  constructor({ userRepository, friendshipRepository, friendRequestRepository, notificationAdapter }) {
    this.userRepository = userRepository;
    this.friendshipRepository = friendshipRepository;
    this.friendRequestRepository = friendRequestRepository;
    this.notificationAdapter = notificationAdapter;
  }

  /**
   * Execute send friend request
   * @param {string} requesterId - Requester user ID
   * @param {string} recipientId - Recipient user ID
   * @param {string} message - Optional message
   * @returns {Promise<Object>} Created friend request
   */
  async execute(requesterId, recipientId, message) {
    if (requesterId === recipientId) {
      throw new BadRequestError('Cannot send friend request to yourself', 400);
    }

    // Check if recipient exists
    const recipient = await this.userRepository.findById(recipientId);
    if (!recipient) {
      throw new NotFoundError('User not found', 404);
    }

    // Check if recipient allows friend requests
    if (!recipient.friendSettings || !recipient.friendSettings.allowFriendRequests) {
      throw new FriendRequestsNotAllowedError('This user does not accept friend requests', 400);
    }

    // Check if already friends
    const existingFriendship = await this.friendshipRepository.findFriendship(requesterId, recipientId);
    if (existingFriendship && existingFriendship.isActive()) {
      throw new FriendshipAlreadyExistsError('Friendship already exists', 400);
    }

    // Check if there's already a pending request
    const existingRequest = await this.friendRequestRepository.findPendingRequest(requesterId, recipientId);
    if (existingRequest) {
      throw new FriendRequestAlreadyExistsError('Friend request already exists', 400);
    }

    // Create friend request
    const friendRequest = await this.friendRequestRepository.create(requesterId, recipientId, message);

    // Send notification to recipient
    const requester = await this.userRepository.findById(requesterId);
    if (this.notificationAdapter) {
      this.notificationAdapter.send(recipientId, {
        title: 'New Friend Request',
        body: `${requester.username || requester.fullName} wants to be your friend`
      }, {
        type: 'friend_request',
        requestId: friendRequest.id
      }).catch(err => console.error('Failed to send notification:', err));
    }

    return { requestId: friendRequest.id };
  }
}

module.exports = SendFriendRequestUseCase;

