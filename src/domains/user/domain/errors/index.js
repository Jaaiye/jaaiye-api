/**
 * Domain Errors
 * Domain layer - custom domain errors
 */

class UserNotFoundError extends Error {
  constructor(message = 'User not found') {
    super(message);
    this.name = 'UserNotFoundError';
    this.statusCode = 404;
  }
}

class InvalidPasswordError extends Error {
  constructor(message = 'Invalid password') {
    super(message);
    this.name = 'InvalidPasswordError';
    this.statusCode = 401;
  }
}

class UsernameTakenError extends Error {
  constructor(message = 'Username already taken') {
    super(message);
    this.name = 'UsernameTakenError';
    this.statusCode = 409;
  }
}

class EmailAlreadyInUseError extends Error {
  constructor(message = 'Email is already in use') {
    super(message);
    this.name = 'EmailAlreadyInUseError';
    this.statusCode = 409;
  }
}

class SameEmailError extends Error {
  constructor(message = 'New email cannot be the same as the current email') {
    super(message);
    this.name = 'SameEmailError';
    this.statusCode = 409;
  }
}

module.exports = {
  UserNotFoundError,
  InvalidPasswordError,
  UsernameTakenError,
  EmailAlreadyInUseError,
  SameEmailError
};

