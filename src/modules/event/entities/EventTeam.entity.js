/**
 * Event Team Domain Entity
 * Pure business logic for event team members (ticketed events)
 */

class EventTeamEntity {
  constructor({
    id,
    event,
    user,
    role,
    invitedBy = null,
    status = 'pending',
    permissions = {},
    createdAt,
    updatedAt
  }) {
    this.id = id;
    this.event = event;
    this.user = user;
    this.role = role;
    this.invitedBy = invitedBy;
    this.status = status;
    this.permissions = permissions;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Business Rule: Can this team member perform an action?
   */
  canPerform(action) {
    if (this.status !== 'accepted') {
      return false;
    }
    return this.permissions[action] === true;
  }

  /**
   * Business Rule: Is this the creator?
   */
  isCreator() {
    return this.role === 'creator';
  }

  /**
   * Business Rule: Is this a co-organizer?
   */
  isCoOrganizer() {
    return this.role === 'co_organizer';
  }

  /**
   * Business Rule: Is this a ticket scanner?
   */
  isTicketScanner() {
    return this.role === 'ticket_scanner';
  }

  toJSON() {
    return {
      id: this.id,
      event: this.event,
      user: this.user,
      role: this.role,
      invitedBy: this.invitedBy,
      status: this.status,
      permissions: this.permissions,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = EventTeamEntity;

