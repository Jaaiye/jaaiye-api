/**
 * Auth Domain Errors
 * These represent business rule violations
 */

const { AppError } = require('../../../../utils/errors');

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

class TokenExpiredError extends AppError {
  constructor(message = 'Token has expired') {
    super(message, 401);
    this.name = 'TokenExpiredError';
  }
}

class InvalidTokenError extends AppError {
  constructor(message = 'Invalid token') {
    super(message, 401);
    this.name = 'InvalidTokenError';
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

module.exports = {
  EmailNotVerifiedError,
  AccountBlockedError,
  InvalidCredentialsError,
  TokenExpiredError,
  InvalidTokenError,
  VerificationCodeExpiredError,
  InvalidVerificationCodeError,
  ValidationError,
  UnauthorizedError
};

