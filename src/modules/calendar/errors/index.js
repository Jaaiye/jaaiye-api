/**
 * Calendar Domain Errors
 */

const { AppError } = require('../../../utils/errors');

class CalendarNotFoundError extends AppError {
  constructor(message = 'Calendar not found') {
    super(message, 404);
    this.name = 'CalendarNotFoundError';
  }
}

class CalendarAlreadyExistsError extends AppError {
  constructor(message = 'User already has a calendar') {
    super(message, 409);
    this.name = 'CalendarAlreadyExistsError';
  }
}

class CalendarAccessDeniedError extends AppError {
  constructor(message = 'Access denied to calendar') {
    super(message, 403);
    this.name = 'CalendarAccessDeniedError';
  }
}

class CalendarEditDeniedError extends AppError {
  constructor(message = 'You do not have permission to edit this calendar') {
    super(message, 403);
    this.name = 'CalendarEditDeniedError';
  }
}

class InvalidGoogleCalendarMappingError extends AppError {
  constructor(message = 'Invalid Google calendar mapping') {
    super(message, 400);
    this.name = 'InvalidGoogleCalendarMappingError';
  }
}

class GoogleAccountNotLinkedError extends AppError {
  constructor(message = 'Google account not linked') {
    super(message, 400);
    this.name = 'GoogleAccountNotLinkedError';
  }
}

class GoogleTokenExpiredError extends AppError {
  constructor(message = 'Google access token has expired') {
    super(message, 401);
    this.name = 'GoogleTokenExpiredError';
  }
}

module.exports = {
  CalendarNotFoundError,
  CalendarAlreadyExistsError,
  CalendarAccessDeniedError,
  CalendarEditDeniedError,
  InvalidGoogleCalendarMappingError,
  GoogleAccountNotLinkedError,
  GoogleTokenExpiredError
};

