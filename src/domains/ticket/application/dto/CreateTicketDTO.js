/**
 * Create Ticket DTO
 * Application layer - data transfer object
 */

const { ValidationError } = require('../../../shared/domain/errors');

class CreateTicketDTO {
  constructor(data) {
    this.eventId = data.eventId;
    this.ticketTypeId = data.ticketTypeId || null;
    this.quantity = data.quantity || 1;
    this.userId = data.userId; // Target user (admin creates for user)
    this.username = data.username; // Alternative to userId
    this.complimentary = data.complimentary || false;
    this.bypassCapacity = data.bypassCapacity || false;
  }

  validate() {
    if (!this.eventId) {
      throw new ValidationError('Event ID is required');
    }

    if (this.quantity < 1 || this.quantity > 10) {
      throw new ValidationError('Quantity must be between 1 and 10');
    }

    if (!this.userId && !this.username) {
      throw new ValidationError('Target user is required (provide userId or username)');
    }
  }
}

module.exports = CreateTicketDTO;

