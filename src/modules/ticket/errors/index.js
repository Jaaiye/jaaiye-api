const { AppError } = require('../../../utils/errors');

class TicketNotFoundError extends AppError {
  constructor(message = 'Ticket not found') {
    super(message, 404);
    this.name = 'TicketNotFoundError';
  }
}

class TicketAlreadyUsedError extends AppError {
  constructor(data = {}) {
    const message = data.ticket
      ? 'Ticket has already been used'
      : (typeof data === 'string' ? data : 'Ticket has already been used');
    super(message, 400);
    this.name = 'TicketAlreadyUsedError';
    this.ticket = data.ticket || null;
  }
}

class TicketAlreadyCancelledError extends AppError {
  constructor(message = 'Ticket is already cancelled') {
    super(message, 400);
    this.name = 'TicketAlreadyCancelledError';
  }
}

class TicketAccessDeniedError extends AppError {
  constructor(message = 'You do not have access to this ticket') {
    super(message, 403);
    this.name = 'TicketAccessDeniedError';
  }
}

class InvalidTicketTypeError extends AppError {
  constructor(message = 'Invalid or unavailable ticket type') {
    super(message, 400);
    this.name = 'InvalidTicketTypeError';
  }
}

module.exports = {
  TicketNotFoundError,
  TicketAlreadyUsedError,
  TicketAlreadyCancelledError,
  TicketAccessDeniedError,
  InvalidTicketTypeError
};

