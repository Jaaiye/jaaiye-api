/**
 * Get Free Busy Use Case
 * Application layer - use case
 */

const { ValidationError, GoogleAccountNotLinkedError } = require('../errors');

class GetFreeBusyUseCase {
  constructor({ userRepository, googleCalendarAdapter }) {
    this.userRepository = userRepository;
    this.googleCalendarAdapter = googleCalendarAdapter;
  }

  /**
   * Execute get free/busy
   * @param {string} userId - User ID
   * @param {string} timeMin - ISO string
   * @param {string} timeMax - ISO string
   * @param {Array<string>} calendarIds - Optional calendar IDs
   * @returns {Promise<Object>} Free/busy data
   */
  async execute(userId, timeMin, timeMax, calendarIds = null) {
    if (!timeMin || !timeMax) {
      throw new ValidationError('timeMin and timeMax are required (ISO strings)');
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (!user.googleCalendar || !user.googleCalendar.refreshToken) {
      throw new GoogleAccountNotLinkedError('No Google account linked. Please link your Google account first.');
    }

    // Use provided calendarIds, or fallback to selectedCalendarIds
    // If both are empty, user doesn't want to share calendar
    const calendarIdsToUse = calendarIds || user.googleCalendar.selectedCalendarIds || [];
    const freeBusy = await this.googleCalendarAdapter.getFreeBusy(
      user,
      timeMin,
      timeMax,
      calendarIdsToUse.length > 0 ? calendarIdsToUse : null
    );

    return { freeBusy };
  }
}

module.exports = GetFreeBusyUseCase;

