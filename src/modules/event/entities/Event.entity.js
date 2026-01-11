/**
 * Event Domain Entity
 * Pure business logic, framework-agnostic
 */

class EventEntity {
  constructor({
    id,
    calendar,
    title,
    slug,
    description,
    startTime,
    endTime,
    isAllDay = false,
    category = 'hangout',
    privacy = 'private',
    status = 'draft',
    ticketTypes = [],
    ticketFee = null,
    attendeeCount = 0,
    image = null,
    venue = null,
    reminders = [],
    external = {},
    createdBy,
    creatorId,
    origin = 'user',
    publishedAt = null,
    createdAt,
    updatedAt
  }) {
    this.id = id;
    this.calendar = calendar;
    this.title = title;
    this.slug = slug;
    this.description = description;
    this.startTime = startTime;
    this.endTime = endTime;
    this.isAllDay = isAllDay;
    this.category = category;
    this.privacy = privacy;
    this.status = status;
    this.ticketTypes = ticketTypes;
    this.ticketFee = ticketFee;
    this.attendeeCount = attendeeCount;
    this.image = image;
    this.venue = venue;
    this.reminders = reminders;
    this.external = external;
    // Legacy string identifier ("Jaaiye" or user id/email/username)
    this.createdBy = createdBy;
    // New normalized creator reference for permissions (ObjectId as string)
    this.creatorId = creatorId;
    // Explicit origin flag to distinguish user vs Jaaiye vs others
    this.origin = origin;
    this.publishedAt = publishedAt;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Business Rule: Is event a hangout?
   * @returns {boolean}
   */
  isHangout() {
    return this.category === 'hangout';
  }

  /**
   * Business Rule: Is event published?
   * @returns {boolean}
   */
  isPublished() {
    return this.status === 'published' || this.status === 'scheduled';
  }

  /**
   * Business Rule: Is event a draft?
   * @returns {boolean}
   */
  isDraft() {
    return this.status === 'draft';
  }

  /**
   * Business Rule: Can event sell tickets?
   * Only published events can sell tickets
   * @returns {boolean}
   */
  canSellTickets() {
    return this.category === 'event' && this.isPublished();
  }

  /**
   * Business Rule: Is event a paid event?
   * @returns {boolean}
   */
  isPaidEvent() {
    return this.category === 'event' && (
      (this.ticketFee !== null && this.ticketFee !== 'free') ||
      (Array.isArray(this.ticketTypes) && this.ticketTypes.length > 0)
    );
  }

  /**
   * Business Rule: Can event have tickets?
   * @returns {boolean}
   */
  canHaveTickets() {
    return this.category === 'event';
  }

  /**
   * Business Rule: Is event scheduled?
   * @returns {boolean}
   */
  isScheduled() {
    return this.status === 'scheduled';
  }

  /**
   * Business Rule: Is event cancelled?
   * @returns {boolean}
   */
  isCancelled() {
    return this.status === 'cancelled';
  }

  /**
   * Business Rule: Get available ticket types
   * @returns {Array}
   */
  getAvailableTicketTypes() {
    if (!this.canHaveTickets()) {
      return [];
    }

    const now = new Date();
    return this.ticketTypes.filter(ticketType => {
      if (!ticketType.isActive) return false;
      if (ticketType.salesStartDate && now < ticketType.salesStartDate) return false;
      if (ticketType.salesEndDate && now > ticketType.salesEndDate) return false;
      if (ticketType.capacity && ticketType.soldCount >= ticketType.capacity) return false;
      return true;
    });
  }

  /**
   * Business Rule: Increment ticket sales
   * @param {string} ticketTypeId - Optional ticket type ID
   * @param {number} quantity - Quantity to increment
   * @param {boolean} bypassCapacity - Bypass capacity check
   */
  incrementTicketSales(ticketTypeId = null, quantity = 1, bypassCapacity = false) {
    if (ticketTypeId) {
      const ticketType = this.ticketTypes.find(tt => tt.id === ticketTypeId);
      if (!ticketType) {
        throw new Error('Ticket type not found');
      }

      if (!bypassCapacity && ticketType.capacity && (ticketType.soldCount + quantity) > ticketType.capacity) {
        throw new Error('Ticket capacity exceeded');
      }

      ticketType.soldCount += quantity;
    }

    this.attendeeCount += quantity;
  }

  /**
   * Business Rule: Decrement ticket sales
   * @param {string} ticketTypeId - Optional ticket type ID
   * @param {number} quantity - Quantity to decrement
   */
  decrementTicketSales(ticketTypeId = null, quantity = 1) {
    if (ticketTypeId) {
      const ticketType = this.ticketTypes.find(tt => tt.id === ticketTypeId);
      if (ticketType) {
        ticketType.soldCount = Math.max(0, ticketType.soldCount - quantity);
      }
    }

    this.attendeeCount = Math.max(0, this.attendeeCount - quantity);
  }

  /**
   * Convert to plain object
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      calendar: this.calendar,
      title: this.title,
      slug: this.slug,
      description: this.description,
      startTime: this.startTime,
      endTime: this.endTime,
      isAllDay: this.isAllDay,
      category: this.category,
      privacy: this.privacy,
      status: this.status,
      ticketTypes: this.ticketTypes,
      ticketFee: this.ticketFee,
      attendeeCount: this.attendeeCount,
      image: this.image,
      venue: this.venue,
      reminders: this.reminders,
      external: this.external,
      creatorId: this.creatorId,
      origin: this.origin,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = EventEntity;

