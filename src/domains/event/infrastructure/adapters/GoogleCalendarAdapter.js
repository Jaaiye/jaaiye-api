/**
 * Google Calendar Adapter for Event Domain
 * Infrastructure layer - external services
 * Reuses Calendar domain's Google Calendar adapter
 */

const { GoogleCalendarAdapter } = require('../../../calendar/infrastructure/adapters');

class EventGoogleCalendarAdapter {
  /**
   * Insert event into Google Calendar
   * @param {Object} user - User entity
   * @param {Object} eventBody - Event data
   * @param {string} calendarId - Optional calendar ID
   * @returns {Promise<Object>} Google event
   */
  async insertEvent(user, eventBody, calendarId = null) {
    const adapter = new GoogleCalendarAdapter();
    return adapter.insertEvent(user, eventBody, calendarId);
  }

  /**
   * Update event in Google Calendar
   * @param {Object} user - User entity
   * @param {string} calendarId - Calendar ID
   * @param {string} eventId - Event ID
   * @param {Object} eventBody - Updated event data
   * @returns {Promise<Object>} Updated Google event
   */
  async updateEvent(user, calendarId, eventId, eventBody) {
    const adapter = new GoogleCalendarAdapter();
    return adapter.updateEvent(user, calendarId, eventId, eventBody);
  }

  /**
   * Delete event from Google Calendar
   * @param {Object} user - User entity
   * @param {string} calendarId - Calendar ID
   * @param {string} eventId - Event ID
   * @returns {Promise<void>}
   */
  async deleteEvent(user, calendarId, eventId) {
    const adapter = new GoogleCalendarAdapter();
    return adapter.deleteEvent(user, calendarId, eventId);
  }
}

module.exports = EventGoogleCalendarAdapter;

