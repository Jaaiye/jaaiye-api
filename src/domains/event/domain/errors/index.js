const { AppError } = require('../../../../utils/errors');

class EventNotFoundError extends AppError {
  constructor(message = 'Event not found') {
    super(message, 404);
    this.name = 'EventNotFoundError';
  }
}

class EventAccessDeniedError extends AppError {
  constructor(message = 'Access denied to event') {
    super(message, 403);
    this.name = 'EventAccessDeniedError';
  }
}

class ParticipantNotFoundError extends AppError {
  constructor(message = 'Participant not found') {
    super(message, 404);
    this.name = 'ParticipantNotFoundError';
  }
}

class ParticipantAlreadyExistsError extends AppError {
  constructor(message = 'User is already a participant') {
    super(message, 409);
    this.name = 'ParticipantAlreadyExistsError';
  }
}

class InvalidEventCategoryError extends AppError {
  constructor(message = 'Invalid event category') {
    super(message, 400);
    this.name = 'InvalidEventCategoryError';
  }
}

class TicketTypeNotFoundError extends AppError {
  constructor(message = 'Ticket type not found') {
    super(message, 404);
    this.name = 'TicketTypeNotFoundError';
  }
}

module.exports = {
  EventNotFoundError,
  EventAccessDeniedError,
  ParticipantNotFoundError,
  ParticipantAlreadyExistsError,
  InvalidEventCategoryError,
  TicketTypeNotFoundError
};

