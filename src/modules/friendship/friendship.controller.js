/**
 * Friendship Controller
 * Presentation layer - HTTP request/response handling
 */

const { asyncHandler } = require('../../utils/asyncHandler');
const { successResponse } = require('../../utils/response');
const {
  SendFriendRequestDTO,
  RespondToFriendRequestDTO,
  UpdateFriendSettingsDTO
} = require('./dto');

class FriendshipController {
  constructor({
    searchUsersUseCase,
    sendFriendRequestUseCase,
    getFriendRequestsUseCase,
    respondToFriendRequestUseCase,
    getFriendsUseCase,
    removeFriendUseCase,
    blockUserUseCase,
    unblockUserUseCase,
    updateFriendSettingsUseCase
  }) {
    this.searchUsersUseCase = searchUsersUseCase;
    this.sendFriendRequestUseCase = sendFriendRequestUseCase;
    this.getFriendRequestsUseCase = getFriendRequestsUseCase;
    this.respondToFriendRequestUseCase = respondToFriendRequestUseCase;
    this.getFriendsUseCase = getFriendsUseCase;
    this.removeFriendUseCase = removeFriendUseCase;
    this.blockUserUseCase = blockUserUseCase;
    this.unblockUserUseCase = unblockUserUseCase;
    this.updateFriendSettingsUseCase = updateFriendSettingsUseCase;
  }

  /**
   * @swagger
   * /users/search:
   *   get:
   *     summary: Search users for friendship
   *     tags: [Friendship]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: query
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: List of users
   */
  searchUsers = asyncHandler(async (req, res) => {
    const { query, limit = 20 } = req.query;
    const result = await this.searchUsersUseCase.execute(req.user.id, query, limit);
    return successResponse(res, result);
  });

  /**
   * @swagger
   * /users/friend-request:
   *   post:
   *     summary: Send friend request
   *     tags: [Friendship]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [recipientId]
   *             properties:
   *               recipientId:
   *                 type: string
   *               message:
   *                 type: string
   *     responses:
   *       201:
   *         description: Request sent
   */
  sendFriendRequest = asyncHandler(async (req, res) => {
    const dto = new SendFriendRequestDTO(req.body);
    const result = await this.sendFriendRequestUseCase.execute(
      req.user.id,
      dto.recipientId,
      dto.message
    );
    return successResponse(res, result, 201, 'Friend request sent');
  });

  /**
   * @swagger
   * /users/friend-requests:
   *   get:
   *     summary: Get friend requests
   *     tags: [Friendship]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: type
   *         schema:
   *           type: string
   *           enum: [received, sent]
   *     responses:
   *       200:
   *         description: List of requests
   */
  getFriendRequests = asyncHandler(async (req, res) => {
    const { type = 'received' } = req.query;
    const result = await this.getFriendRequestsUseCase.execute(req.user.id, type);
    return successResponse(res, result);
  });

  /**
   * @swagger
   * /users/friend-requests/{requestId}:
   *   put:
   *     summary: Respond to friend request
   *     tags: [Friendship]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: requestId
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [action]
   *             properties:
   *               action:
   *                 type: string
   *                 enum: [accept, decline]
   *     responses:
   *       200:
   *         description: Action successful
   */
  respondToFriendRequest = asyncHandler(async (req, res) => {
    const { requestId } = req.params;
    const dto = new RespondToFriendRequestDTO(req.body);
    const result = await this.respondToFriendRequestUseCase.execute(
      req.user.id,
      requestId,
      dto.action
    );

    if (dto.action === 'accept') {
      return successResponse(res, result, 200, 'Friend request accepted');
    } else {
      return successResponse(res, null, 200, 'Friend request declined');
    }
  });

  /**
   * @swagger
   * /users/friends:
   *   get:
   *     summary: Get friends list
   *     tags: [Friendship]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: List of friends
   */
  getFriends = asyncHandler(async (req, res) => {
    const result = await this.getFriendsUseCase.execute(req.user.id);
    return successResponse(res, result);
  });

  /**
   * @swagger
   * /users/friends:
   *   delete:
   *     summary: Remove a friend
   *     tags: [Friendship]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [friendId]
   *             properties:
   *               friendId:
   *                 type: string
   *     responses:
   *       200:
   *         description: Friend removed
   */
  removeFriend = asyncHandler(async (req, res) => {
    const { friendId } = req.body;
    await this.removeFriendUseCase.execute(req.user.id, friendId);
    return successResponse(res, null, 200, 'Friend removed successfully');
  });

  /**
   * @swagger
   * /users/block/{userId}:
   *   post:
   *     summary: Block a user
   *     tags: [Friendship]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: User blocked
   */
  blockUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    await this.blockUserUseCase.execute(req.user.id, userId);
    return successResponse(res, null, 200, 'User blocked successfully');
  });

  /**
   * @swagger
   * /users/unblock/{userId}:
   *   post:
   *     summary: Unblock a user
   *     tags: [Friendship]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: User unblocked
   */
  unblockUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    await this.unblockUserUseCase.execute(req.user.id, userId);
    return successResponse(res, null, 200, 'User unblocked successfully');
  });

  /**
   * @swagger
   * /users/friend-settings:
   *   put:
   *     summary: Update friend settings
   *     tags: [Friendship]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Settings updated
   */
  updateFriendSettings = asyncHandler(async (req, res) => {
    const dto = new UpdateFriendSettingsDTO(req.body);
    const result = await this.updateFriendSettingsUseCase.execute(req.user.id, dto);
    return successResponse(res, result, 200, 'Friend settings updated');
  });
}

module.exports = FriendshipController;


