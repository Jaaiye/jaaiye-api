/**
 * Select Google Calendars Use Case
 * Application layer - use case
 */

const { ValidationError } = require('../../../shared/domain/errors');
const { GoogleAccountNotLinkedError } = require('../../domain/errors');

class SelectGoogleCalendarsUseCase {
  constructor({ userRepository }) {
    this.userRepository = userRepository;
  }

  /**
   * Execute select Google calendars
   * @param {string} userId - User ID
   * @param {string} action - 'add' or 'remove'
   * @param {string} calendarId - Google calendar ID
   * @returns {Promise<Object>} Result
   */
  async execute(userId, action, calendarId) {
    if (!action || !calendarId) {
      throw new ValidationError('action and calendarId are required');
    }

    if (!['add', 'remove'].includes(action)) {
      throw new ValidationError('action must be "add" or "remove"');
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (!user.googleCalendar) {
      throw new GoogleAccountNotLinkedError('No Google account linked.');
    }

    // Initialize selectedCalendarIds if it doesn't exist
    if (!user.googleCalendar.selectedCalendarIds) {
      user.googleCalendar.selectedCalendarIds = [];
    }

    let message = '';
    let updatedCalendarIds = [...user.googleCalendar.selectedCalendarIds];

    if (action === 'add') {
      if (!updatedCalendarIds.includes(calendarId)) {
        updatedCalendarIds.push(calendarId);
        message = 'Calendar added successfully';
      } else {
        message = 'Calendar already selected';
      }
    } else if (action === 'remove') {
      const index = updatedCalendarIds.indexOf(calendarId);
      if (index > -1) {
        updatedCalendarIds.splice(index, 1);
        message = 'Calendar removed successfully';
      } else {
        message = 'Calendar was not selected';
      }
    }

    // Update user's selected calendar IDs
    await this.userRepository.update(userId, {
      'googleCalendar.selectedCalendarIds': updatedCalendarIds
    });

    return {
      selectedCalendarIds: updatedCalendarIds,
      message,
      action,
      calendarId
    };
  }
}

module.exports = SelectGoogleCalendarsUseCase;

