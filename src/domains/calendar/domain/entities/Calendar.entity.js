/**
 * Calendar Domain Entity
 * Pure business logic, framework-agnostic
 */

class CalendarEntity {
  constructor({
    id,
    owner,
    name,
    description,
    color = '#4285F4',
    isDefault = true,
    isPublic = false,
    sharedWith = [],
    google = {},
    createdAt,
    updatedAt
  }) {
    this.id = id;
    this.owner = owner;
    this.name = name;
    this.description = description;
    this.color = color;
    this.isDefault = isDefault;
    this.isPublic = isPublic;
    this.sharedWith = sharedWith;
    this.google = google;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Business Rule: Is calendar owned by user?
   * @param {string} userId - User ID to check
   * @returns {boolean}
   */
  isOwnedBy(userId) {
    return this.owner.toString() === userId.toString();
  }

  /**
   * Business Rule: Is calendar shared with user?
   * @param {string} userId - User ID to check
   * @returns {boolean}
   */
  isSharedWith(userId) {
    return this.sharedWith.some(share => {
      const shareUserId = share.user?.toString() || share.toString();
      return shareUserId === userId.toString();
    });
  }

  /**
   * Business Rule: Can user access calendar?
   * @param {string} userId - User ID to check
   * @returns {boolean}
   */
  canBeAccessedBy(userId) {
    return this.isPublic || this.isOwnedBy(userId) || this.isSharedWith(userId);
  }

  /**
   * Business Rule: Can user edit calendar?
   * @param {string} userId - User ID to check
   * @returns {boolean}
   */
  canBeEditedBy(userId) {
    if (this.isOwnedBy(userId)) return true;

    const share = this.sharedWith.find(share => {
      const shareUserId = share.user?.toString() || share.toString();
      return shareUserId === userId.toString();
    });

    return share && (share.role === 'editor' || share.permission === 'edit' || share.permission === 'manage');
  }

  /**
   * Business Rule: Has Google calendars linked?
   * @returns {boolean}
   */
  hasGoogleLinked() {
    return this.google && this.google.linkedIds && this.google.linkedIds.length > 0;
  }

  /**
   * Business Rule: Get primary Google calendar ID
   * @returns {string|null}
   */
  getPrimaryGoogleCalendarId() {
    return this.google?.primaryId || null;
  }

  /**
   * Convert entity to plain object
   * @returns {Object}
   */
  toObject() {
    return {
      id: this.id,
      owner: this.owner,
      name: this.name,
      description: this.description,
      color: this.color,
      isDefault: this.isDefault,
      isPublic: this.isPublic,
      sharedWith: this.sharedWith,
      google: this.google,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = CalendarEntity;

