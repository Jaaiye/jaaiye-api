/**
 * Event Participant Domain Entity
 * Pure business logic, framework-agnostic
 */

class EventParticipantEntity {
  constructor({
    id,
    event,
    user,
    role = 'attendee',
    status = 'pending',
    responseTime = null,
    reminders = [],
    createdAt,
    updatedAt
  }) {
    this.id = id;
    this.event = event;
    this.user = user;
    this.role = role;
    this.status = status;
    this.responseTime = responseTime;
    this.reminders = reminders;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Business Rule: Is participant an organizer?
   * @returns {boolean}
   */
  isOrganizer() {
    return this.role === 'organizer';
  }

  /**
   * Business Rule: Has participant accepted?
   * @returns {boolean}
   */
  hasAccepted() {
    return this.status === 'accepted';
  }

  /**
   * Business Rule: Has participant declined?
   * @returns {boolean}
   */
  hasDeclined() {
    return this.status === 'declined';
  }

  /**
   * Business Rule: Update status
   * @param {string} newStatus - New status
   */
  updateStatus(newStatus) {
    const validStatuses = ['pending', 'accepted', 'declined', 'tentative'];
    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Invalid status: ${newStatus}`);
    }
    this.status = newStatus;
    this.responseTime = new Date();
  }

  /**
   * Convert to plain object
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      event: this.event,
      user: this.user,
      role: this.role,
      status: this.status,
      responseTime: this.responseTime,
      reminders: this.reminders,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = EventParticipantEntity;

