/**
 * Calendar Repository Interface (Port)
 * Defines contract for calendar persistence
 */

class ICalendarRepository {
  /**
   * Find calendar by ID
   * @param {string} calendarId - Calendar ID
   * @returns {Promise<CalendarEntity|null>}
   */
  async findById(calendarId) {
    throw new Error('Method not implemented');
  }

  /**
   * Find calendar by owner
   * @param {string} ownerId - Owner user ID
   * @returns {Promise<CalendarEntity|null>}
   */
  async findByOwner(ownerId) {
    throw new Error('Method not implemented');
  }

  /**
   * Find all calendars accessible by user
   * @param {string} userId - User ID
   * @returns {Promise<CalendarEntity[]>}
   */
  async findAccessibleByUser(userId) {
    throw new Error('Method not implemented');
  }

  /**
   * Create calendar
   * @param {Object} data - Calendar data
   * @returns {Promise<CalendarEntity>}
   */
  async create(data) {
    throw new Error('Method not implemented');
  }

  /**
   * Update calendar
   * @param {string} calendarId - Calendar ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<CalendarEntity>}
   */
  async update(calendarId, updates) {
    throw new Error('Method not implemented');
  }

  /**
   * Delete calendar
   * @param {string} calendarId - Calendar ID
   * @returns {Promise<void>}
   */
  async delete(calendarId) {
    throw new Error('Method not implemented');
  }

  /**
   * Check if user has calendar
   * @param {string} ownerId - Owner user ID
   * @returns {Promise<boolean>}
   */
  async userHasCalendar(ownerId) {
    throw new Error('Method not implemented');
  }
}

module.exports = ICalendarRepository;

