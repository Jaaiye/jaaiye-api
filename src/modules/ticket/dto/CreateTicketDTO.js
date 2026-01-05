/**
 * Create Ticket DTO
 * Application layer - data transfer object
 */

const { ValidationError } = require('../../common/errors');

class CreateTicketDTO {
  constructor(data) {
    this.eventId = data.eventId;
    this.ticketTypeId = data.ticketTypeId || null;
    this.quantity = data.quantity || 1;
    this.userId = data.userId; // Target user (required - resolved from username/email in controller)
    this.username = data.username; // Legacy support (optional)
    this.email = data.email; // Legacy support (optional)
    this.bypassCapacity = data.bypassCapacity || false;
  }

  validate() {
    if (!this.eventId) {
      throw new ValidationError('Event ID is required');
    }

    if (this.quantity < 1 || this.quantity > 10) {
      throw new ValidationError('Quantity must be between 1 and 10');
    }

    // For event controller flow, userId is required (resolved from username/email)
    // For admin flow, userId, username, or email can be provided
    if (!this.userId && !this.username && !this.email) {
      throw new ValidationError('Target user is required (provide userId, username, or email)');
    }
  }
}

module.exports = CreateTicketDTO;

