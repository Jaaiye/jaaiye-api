/**
 * Ticket Entity
 * Domain layer - core business entity
 */

class TicketEntity {
  constructor({
    id,
    userId,
    eventId,
    ticketTypeId,
    ticketTypeName,
    price,
    quantity,
    qrCode,
    ticketData,
    publicId,
    status,
    usedAt,
    verifiedBy,
    createdAt,
    updatedAt
  }) {
    this.id = id;
    this.userId = userId;
    this.eventId = eventId;
    this.ticketTypeId = ticketTypeId;
    this.ticketTypeName = ticketTypeName;
    this.price = price;
    this.quantity = quantity;
    this.qrCode = qrCode;
    this.ticketData = ticketData;
    this.publicId = publicId;
    this.status = status || 'active';
    this.usedAt = usedAt;
    this.verifiedBy = verifiedBy;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Check if ticket is active
   */
  isActive() {
    return this.status === 'active';
  }

  /**
   * Check if ticket is used
   */
  isUsed() {
    return this.status === 'used';
  }

  /**
   * Check if ticket is cancelled
   */
  isCancelled() {
    return this.status === 'cancelled';
  }

  /**
   * Mark ticket as used
   */
  markAsUsed() {
    this.status = 'used';
    this.usedAt = new Date();
    return this;
  }

  /**
   * Cancel ticket
   */
  cancel() {
    this.status = 'cancelled';
    return this;
  }

  /**
   * Get ticket data as object
   */
  getTicketData() {
    try {
      return this.ticketData ? JSON.parse(this.ticketData) : null;
    } catch {
      return null;
    }
  }

  /**
   * Convert to plain object
   */
  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      eventId: this.eventId,
      ticketTypeId: this.ticketTypeId,
      ticketTypeName: this.ticketTypeName,
      price: this.price,
      quantity: this.quantity,
      qrCode: this.qrCode,
      ticketData: this.getTicketData(),
      publicId: this.publicId,
      status: this.status,
      usedAt: this.usedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = TicketEntity;

