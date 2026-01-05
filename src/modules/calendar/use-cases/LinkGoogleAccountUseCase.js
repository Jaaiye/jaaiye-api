/**
 * Link Google Account Use Case
 * Application layer - use case
 */

const { GoogleAccountNotLinkedError } = require('../errors');

class LinkGoogleAccountUseCase {
  constructor({ userRepository, googleCalendarAdapter, calendarSyncAdapter }) {
    this.userRepository = userRepository;
    this.googleCalendarAdapter = googleCalendarAdapter;
    this.calendarSyncAdapter = calendarSyncAdapter;
  }

  /**
   * Execute link Google account
   * @param {string} userId - User ID
   * @param {string} serverAuthCode - Google server auth code
   * @returns {Promise<Object>} Result
   */
  async execute(userId, serverAuthCode) {
    if (!serverAuthCode) {
      throw new Error('serverAuthCode is required');
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const isUpdating = !!(user.googleCalendar && user.googleCalendar.refreshToken);

    // Exchange the auth code for tokens
    const tokens = await this.googleCalendarAdapter.exchangeServerAuthCode(serverAuthCode);
    await this.googleCalendarAdapter.saveTokensToUser(user, tokens);

    // Ensure the Jaaiye calendar exists using fresh tokens
    await this.googleCalendarAdapter.ensureJaaiyeCalendar(user, tokens);

    // If this is a new link (not updating), sync existing events
    if (!isUpdating && this.calendarSyncAdapter) {
      this.calendarSyncAdapter.syncExistingEventsToCalendar(userId).catch(err => {
        console.error('Failed to sync existing events to calendar', {
          userId,
          error: err.message
        });
        // Don't fail the linking process if sync fails
      });
    }

    return {
      message: isUpdating
        ? 'Google account link updated successfully'
        : 'Google account linked successfully'
    };
  }
}

module.exports = LinkGoogleAccountUseCase;

