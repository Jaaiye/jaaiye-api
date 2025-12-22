/**
 * Friendship Domain Errors
 */

const { AppError } = require('../../../utils/errors');

class FriendshipNotFoundError extends AppError {
  constructor(message = 'Friendship not found') {
    super(message, 404);
    this.name = 'FriendshipNotFoundError';
  }
}

class FriendRequestNotFoundError extends AppError {
  constructor(message = 'Friend request not found') {
    super(message, 404);
    this.name = 'FriendRequestNotFoundError';
  }
}

class FriendshipAlreadyExistsError extends AppError {
  constructor(message = 'Friendship already exists') {
    super(message, 409);
    this.name = 'FriendshipAlreadyExistsError';
  }
}

class FriendRequestAlreadyExistsError extends AppError {
  constructor(message = 'Friend request already exists') {
    super(message, 409);
    this.name = 'FriendRequestAlreadyExistsError';
  }
}

class FriendRequestExpiredError extends AppError {
  constructor(message = 'Friend request has expired') {
    super(message, 400);
    this.name = 'FriendRequestExpiredError';
  }
}

class InvalidFriendRequestActionError extends AppError {
  constructor(message = 'Invalid friend request action') {
    super(message, 400);
    this.name = 'InvalidFriendRequestActionError';
  }
}

class CannotBlockSelfError extends AppError {
  constructor(message = 'Cannot block yourself') {
    super(message, 400);
    this.name = 'CannotBlockSelfError';
  }
}

class UserNotBlockedError extends AppError {
  constructor(message = 'User is not blocked') {
    super(message, 400);
    this.name = 'UserNotBlockedError';
  }
}

class FriendRequestsNotAllowedError extends AppError {
  constructor(message = 'This user does not accept friend requests') {
    super(message, 403);
    this.name = 'FriendRequestsNotAllowedError';
  }
}

module.exports = {
  FriendshipNotFoundError,
  FriendRequestNotFoundError,
  FriendshipAlreadyExistsError,
  FriendRequestAlreadyExistsError,
  FriendRequestExpiredError,
  InvalidFriendRequestActionError,
  CannotBlockSelfError,
  UserNotBlockedError,
  FriendRequestsNotAllowedError
};


