/**
 * Calendar Adapter
 * Cross-domain service for creating user calendars
 * Infrastructure layer - cross-domain communication
 */

class CalendarAdapter {
  constructor({ calendarRepository }) {
    this.calendarRepository = calendarRepository;
  }

  /**
   * Create default calendar for user
   * @param {string} userId - User ID
   * @param {string} calendarName - Calendar name
   * @returns {Promise<Object|null>} Created calendar or null
   */
  async createDefaultCalendar(userId, calendarName = 'My Calendar') {
    if (!this.calendarRepository) {
      console.warn('Calendar repository not available, skipping calendar creation');
      return null;
    }

    try {
      // Check if calendar already exists
      const existing = await this.calendarRepository.findByOwner(userId);
      if (existing) {
        console.log('Calendar already exists for user:', userId);
        return existing.toJSON ? existing.toJSON() : existing;
      }

      // Create default calendar
      const calendar = await this.calendarRepository.create({
        owner: userId,
        name: calendarName,
        isDefault: true
      });

      console.log('Default calendar created:', { userId, calendarId: calendar.id });
      return calendar.toJSON ? calendar.toJSON() : calendar;
    } catch (error) {
      console.error('Failed to create default calendar:', error.message);
      // Don't throw - calendar creation should not fail user registration
      return null;
    }
  }

  /**
   * Create calendar for user on registration
   * @param {Object} user - User entity
   * @returns {Promise<Object|null>}
   */
  async createOnRegistration(user) {
    return await this.createDefaultCalendar(
      user.id,
      `${user.username}'s Calendar`
    );
  }

  /**
   * Create calendar for user on Google OAuth
   * @param {Object} user - User entity
   * @returns {Promise<Object|null>}
   */
  async createOnGoogleOAuth(user) {
    return await this.createDefaultCalendar(
      user.id,
      'My Calendar'
    );
  }
}

module.exports = CalendarAdapter;

