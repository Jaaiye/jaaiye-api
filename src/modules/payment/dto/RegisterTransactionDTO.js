/**
 * Register Transaction DTO
 * Application layer - data transfer object
 */

const { ValidationError, BadRequestError } = require('../../common/errors');
const { PAYMENT_PROVIDERS, DEFAULT_QUANTITY } = require('../../../constants/paymentConstants');

class RegisterTransactionDTO {
  constructor(data) {
    this.provider = data.provider;
    this.reference = data.reference;
    this.amount = data.amount;
    this.currency = data.currency || 'NGN';
    this.eventId = data.eventId;
    this.status = data.status;
    this.quantity = data.quantity || DEFAULT_QUANTITY;
    this.transId = data.transId;
    this.ticketTypeId = data.ticketTypeId;
    this.userId = data.userId; // Optional, can come from req.user
  }

  validate() {
    if (!this.provider || !this.reference || !this.amount || !this.eventId) {
      throw new ValidationError('Missing required fields: provider, reference, amount, and eventId are required');
    }

    if (!Object.values(PAYMENT_PROVIDERS).includes(this.provider)) {
      throw new BadRequestError(`Invalid provider. Must be one of: ${Object.values(PAYMENT_PROVIDERS).join(', ')}`);
    }
  }
}

module.exports = RegisterTransactionDTO;

