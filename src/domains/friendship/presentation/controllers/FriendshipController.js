/**
 * Friendship Controller
 * Presentation layer - HTTP request/response handling
 */

const { asyncHandler } = require('../../../../utils/asyncHandler');
const { successResponse } = require('../../../../utils/response');
const {
  SendFriendRequestDTO,
  RespondToFriendRequestDTO,
  UpdateFriendSettingsDTO
} = require('../../application/dto');

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

  searchUsers = asyncHandler(async (req, res) => {
    const { query, limit = 20 } = req.query;
    const result = await this.searchUsersUseCase.execute(req.user.id, query, limit);
    return successResponse(res, result);
  });

  sendFriendRequest = asyncHandler(async (req, res) => {
    const dto = new SendFriendRequestDTO(req.body);
    const result = await this.sendFriendRequestUseCase.execute(
      req.user.id,
      dto.recipientId,
      dto.message
    );
    return successResponse(res, result, 201, 'Friend request sent');
  });

  getFriendRequests = asyncHandler(async (req, res) => {
    const { type = 'received' } = req.query;
    const result = await this.getFriendRequestsUseCase.execute(req.user.id, type);
    return successResponse(res, result);
  });

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

  getFriends = asyncHandler(async (req, res) => {
    const result = await this.getFriendsUseCase.execute(req.user.id);
    return successResponse(res, result);
  });

  removeFriend = asyncHandler(async (req, res) => {
    const { friendId } = req.body;
    await this.removeFriendUseCase.execute(req.user.id, friendId);
    return successResponse(res, null, 200, 'Friend removed successfully');
  });

  blockUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    await this.blockUserUseCase.execute(req.user.id, userId);
    return successResponse(res, null, 200, 'User blocked successfully');
  });

  unblockUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    await this.unblockUserUseCase.execute(req.user.id, userId);
    return successResponse(res, null, 200, 'User unblocked successfully');
  });

  updateFriendSettings = asyncHandler(async (req, res) => {
    const dto = new UpdateFriendSettingsDTO(req.body);
    const result = await this.updateFriendSettingsUseCase.execute(req.user.id, dto);
    return successResponse(res, result, 200, 'Friend settings updated');
  });
}

module.exports = FriendshipController;


