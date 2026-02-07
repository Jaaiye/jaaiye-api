/**
 * Transaction Entity
 * Domain layer - core business entity
 */

class TransactionEntity {
  constructor({
    id,
    provider,
    reference,
    transReference,
    amount,
    currency,
    status,
    transId,
    sessionId,
    userId,
    eventId,
    ticketTypeId,
    quantity,
    raw,
    gatewayFee,
    createdAt,
    updatedAt
  }) {
    this.id = id;
    this.provider = provider;
    this.reference = reference;
    this.transReference = transReference;
    this.amount = amount;
    this.currency = currency || 'NGN';
    this.status = status || 'created';
    this.transId = transId;
    this.sessionId = sessionId;
    this.userId = userId;
    this.eventId = eventId;
    this.ticketTypeId = ticketTypeId;
    this.quantity = quantity || 1;
    this.raw = raw;
    this.gatewayFee = gatewayFee || 0;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Check if transaction is successful
   */
  isSuccessful() {
    return this.status === 'successful' || this.status === 'completed';
  }

  /**
   * Check if transaction is pending
   */
  isPending() {
    return this.status === 'pending' || this.status === 'created';
  }

  /**
   * Check if transaction is failed
   */
  isFailed() {
    return this.status === 'failed' || this.status === 'cancelled';
  }

  /**
   * Mark transaction as successful
   */
  markAsSuccessful() {
    this.status = 'successful';
    return this;
  }

  /**
   * Mark transaction as failed
   */
  markAsFailed() {
    this.status = 'failed';
    return this;
  }

  /**
   * Convert to plain object
   */
  toJSON() {
    return {
      id: this.id,
      provider: this.provider,
      reference: this.reference,
      transReference: this.transReference,
      amount: this.amount,
      currency: this.currency,
      status: this.status,
      transId: this.transId,
      sessionId: this.sessionId,
      userId: this.userId,
      eventId: this.eventId,
      ticketTypeId: this.ticketTypeId,
      quantity: this.quantity,
      raw: this.raw,
      gatewayFee: this.gatewayFee,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = TransactionEntity;

