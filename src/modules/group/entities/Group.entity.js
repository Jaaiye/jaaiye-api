/**
 * Group Domain Entity
 * Pure business logic, framework-agnostic
 */

class GroupEntity {
  constructor({
    id,
    name,
    description,
    creator,
    members = [],
    events = [],
    settings = {},
    isActive = true,
    createdAt,
    updatedAt
  }) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.creator = creator;
    this.members = members;
    this.events = events;
    this.settings = settings;
    this.isActive = isActive;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Business Rule: Is user a member?
   * @param {string} userId - User ID
   * @returns {boolean}
   */
  isMember(userId) {
    return this.members.some(member =>
      member.user?.toString() === userId.toString() || member.user === userId
    );
  }

  /**
   * Business Rule: Is user an admin?
   * @param {string} userId - User ID
   * @returns {boolean}
   */
  isAdmin(userId) {
    const member = this.members.find(member =>
      member.user?.toString() === userId.toString() || member.user === userId
    );
    return member && member.role === 'admin';
  }

  /**
   * Business Rule: Can user add members?
   * @param {string} userId - User ID
   * @returns {boolean}
   */
  canAddMembers(userId) {
    return this.settings.allowMemberInvites && this.isMember(userId);
  }

  /**
   * Business Rule: Can user create events?
   * @param {string} userId - User ID
   * @returns {boolean}
   */
  canCreateEvents(userId) {
    return this.settings.allowMemberEventCreation && this.isMember(userId);
  }

  /**
   * Business Rule: Get member count
   * @returns {number}
   */
  getMemberCount() {
    return this.members.length;
  }

  /**
   * Business Rule: Get event count
   * @returns {number}
   */
  getEventCount() {
    return this.events.length;
  }

  /**
   * Business Rule: Is group active?
   * @returns {boolean}
   */
  isActiveGroup() {
    return this.isActive === true;
  }

  /**
   * Convert to plain object
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      creator: this.creator,
      members: this.members,
      events: this.events,
      settings: this.settings,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      memberCount: this.getMemberCount(),
      eventCount: this.getEventCount()
    };
  }
}

module.exports = GroupEntity;

