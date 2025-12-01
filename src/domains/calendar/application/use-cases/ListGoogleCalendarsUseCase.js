/**
 * List Google Calendars Use Case
 * Application layer - use case
 */

const { GoogleAccountNotLinkedError } = require('../../domain/errors');
const googleUtils = require('../../../../utils/googleUtils');

class ListGoogleCalendarsUseCase {
  constructor({ userRepository, googleCalendarAdapter }) {
    this.userRepository = userRepository;
    this.googleCalendarAdapter = googleCalendarAdapter;
  }

  /**
   * Execute list Google calendars
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Calendars list
   */
  async execute(userId) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (!user.googleCalendar || !user.googleCalendar.refreshToken) {
      throw new GoogleAccountNotLinkedError('No Google account linked. Please link your Google account first.');
    }

    const calendars = await this.googleCalendarAdapter.listCalendars(user);
    const selectedCalendarIds = user.googleCalendar.selectedCalendarIds || [];
    const formattedCalendars = googleUtils.formatGoogleCalendarData(calendars, selectedCalendarIds);

    return {
      calendars: Object.values(formattedCalendars),
      total: Object.keys(formattedCalendars).length
    };
  }
}

module.exports = ListGoogleCalendarsUseCase;

