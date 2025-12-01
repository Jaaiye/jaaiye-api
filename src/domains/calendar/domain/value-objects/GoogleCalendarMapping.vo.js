/**
 * Google Calendar Mapping Value Object
 * Represents the mapping between Google Calendar and Jaaiye Calendar
 */

class GoogleCalendarMappingVO {
  constructor({ linkedIds = [], primaryId = null }) {
    this.linkedIds = Array.isArray(linkedIds) ? linkedIds : [];
    this.primaryId = primaryId;

    this.validate();
  }

  validate() {
    // Validate linkedIds are strings
    if (!this.linkedIds.every(id => typeof id === 'string' && id.length > 0)) {
      throw new Error('All linkedIds must be non-empty strings');
    }

    // Validate primaryId if provided
    if (this.primaryId !== null) {
      if (typeof this.primaryId !== 'string' || this.primaryId.length === 0) {
        throw new Error('primaryId must be a non-empty string');
      }

      // Primary must be in linkedIds
      if (!this.linkedIds.includes(this.primaryId)) {
        throw new Error('primaryId must be one of linkedIds');
      }
    }
  }

  /**
   * Add linked Google calendar ID
   * @param {string} calendarId - Google calendar ID
   */
  addLinkedId(calendarId) {
    if (typeof calendarId !== 'string' || calendarId.length === 0) {
      throw new Error('calendarId must be a non-empty string');
    }

    if (!this.linkedIds.includes(calendarId)) {
      this.linkedIds.push(calendarId);
    }
  }

  /**
   * Remove linked Google calendar ID
   * @param {string} calendarId - Google calendar ID
   */
  removeLinkedId(calendarId) {
    this.linkedIds = this.linkedIds.filter(id => id !== calendarId);

    // If primary was removed, clear it
    if (this.primaryId === calendarId) {
      this.primaryId = null;
    }
  }

  /**
   * Set primary Google calendar ID
   * @param {string} calendarId - Google calendar ID
   */
  setPrimary(calendarId) {
    if (!this.linkedIds.includes(calendarId)) {
      throw new Error('primaryId must be one of linkedIds');
    }
    this.primaryId = calendarId;
  }

  /**
   * Clear primary Google calendar ID
   */
  clearPrimary() {
    this.primaryId = null;
  }

  /**
   * Convert to plain object
   * @returns {Object}
   */
  toObject() {
    return {
      linkedIds: [...this.linkedIds],
      primaryId: this.primaryId
    };
  }
}

module.exports = GoogleCalendarMappingVO;

