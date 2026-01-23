/**
 * Initialize Payment DTO
 * Application layer - data transfer object
 */

const { ValidationError } = require('../../common/errors');

class InitializePaymentDTO {
  constructor(data) {
    this.eventId = data.eventId;
    this.quantity = data.quantity || 1;
    this.ticketTypes = data.ticketTypes || [];
    this.email = data.email;
    this.amount = data.amount;
    this.reference = data.reference;
    this.userId = data.userId; // Optional, can come from req.user
  }

  validate() {
    if (!this.eventId) {
      throw new ValidationError('Event ID is required');
    }

    if (!this.email) {
      throw new ValidationError('Email is required');
    }

    if (!this.amount || this.amount <= 0) {
      throw new ValidationError('Valid amount is required');
    }
  }
}

module.exports = InitializePaymentDTO;

