/**
 * Shared Domain Errors
 * Common errors used across multiple domains
 */

const { AppError } = require('../../../utils/errors');

class EmailNotVerifiedError extends AppError {
  constructor(message = 'Email not verified') {
    super(message, 403);
    this.name = 'EmailNotVerifiedError';
  }
}

class AccountBlockedError extends AppError {
  constructor(message = 'Account is blocked') {
    super(message, 403);
    this.name = 'AccountBlockedError';
  }
}

class InvalidCredentialsError extends AppError {
  constructor(message = 'Invalid credentials') {
    super(message, 401);
    this.name = 'InvalidCredentialsError';
  }
}

class AccessTokenExpiredError extends AppError {
  constructor(message = 'Access token has expired') {
    super(message, 401);
    this.name = 'AccessTokenExpiredError';
  }
}

class RefreshTokenExpiredError extends AppError {
  constructor(message = 'Refresh token has expired') {
    super(message, 401);
    this.name = 'RefreshTokenExpiredError';
  }
}

class InvalidAccessTokenError extends AppError {
  constructor(message = 'Invalid access token') {
    super(message, 401);
    this.name = 'InvalidAccessTokenError';
  }
}

class InvalidRefreshTokenError extends AppError {
  constructor(message = 'Invalid refresh token') {
    super(message, 401);
    this.name = 'InvalidRefreshTokenError';
  }
}

class VerificationCodeExpiredError extends AppError {
  constructor(message = 'Verification code has expired') {
    super(message, 400);
    this.name = 'VerificationCodeExpiredError';
  }
}

class InvalidVerificationCodeError extends AppError {
  constructor(message = 'Invalid verification code') {
    super(message, 400);
    this.name = 'InvalidVerificationCodeError';
  }
}

class ValidationError extends AppError {
  constructor(message) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

class UserNotFoundError extends AppError {
  constructor(message = 'User not found') {
    super(message, 404);
    this.name = 'UserNotFoundError';
  }
}

class InvalidPasswordError extends AppError {
  constructor(message = 'Invalid password') {
    super(message, 401);
    this.name = 'InvalidPasswordError';
  }
}

class UsernameTakenError extends AppError {
  constructor(message = 'Username already taken') {
    super(message, 409);
    this.name = 'UsernameTakenError';
  }
}

class EmailAlreadyInUseError extends AppError {
  constructor(message = 'Email is already in use') {
    super(message, 409);
    this.name = 'EmailAlreadyInUseError';
  }
}

class SameEmailError extends AppError {
  constructor(message = 'New email cannot be the same as the current email') {
    super(message, 409);
    this.name = 'SameEmailError';
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

class BadRequestError extends AppError {
  constructor(message = 'Bad request') {
    super(message, 400);
    this.name = 'BadRequestError';
  }
}

class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests. Please try again later.') {
    super(message, 429);
    this.name = 'TooManyRequestsError';
  }
}

module.exports = {
  EmailNotVerifiedError,
  AccountBlockedError,
  InvalidCredentialsError,
  AccessTokenExpiredError,
  RefreshTokenExpiredError,
  InvalidAccessTokenError,
  InvalidRefreshTokenError,
  VerificationCodeExpiredError,
  InvalidVerificationCodeError,
  ValidationError,
  UnauthorizedError,
  UserNotFoundError,
  InvalidPasswordError,
  UsernameTakenError,
  EmailAlreadyInUseError,
  SameEmailError,
  NotFoundError,
  BadRequestError,
  ConflictError,
  TooManyRequestsError
};

