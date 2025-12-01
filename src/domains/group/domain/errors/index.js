const { AppError } = require('../../../../utils/errors');

class GroupNotFoundError extends AppError {
  constructor(message = 'Group not found') {
    super(message, 404);
    this.name = 'GroupNotFoundError';
  }
}

class GroupAccessDeniedError extends AppError {
  constructor(message = 'Access denied to this group') {
    super(message, 403);
    this.name = 'GroupAccessDeniedError';
  }
}

class UserNotMemberError extends AppError {
  constructor(message = 'User is not a member of this group') {
    super(message, 403);
    this.name = 'UserNotMemberError';
  }
}

class UserAlreadyMemberError extends AppError {
  constructor(message = 'User is already a member of this group') {
    super(message, 409);
    this.name = 'UserAlreadyMemberError';
  }
}

class CannotRemoveCreatorError extends AppError {
  constructor(message = 'Cannot remove the group creator') {
    super(message, 403);
    this.name = 'CannotRemoveCreatorError';
  }
}

module.exports = {
  GroupNotFoundError,
  GroupAccessDeniedError,
  UserNotMemberError,
  UserAlreadyMemberError,
  CannotRemoveCreatorError
};

