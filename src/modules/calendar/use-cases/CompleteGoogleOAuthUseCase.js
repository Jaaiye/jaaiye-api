/**
 * Complete Google OAuth Use Case
 * Application layer - use case
 * Processes OAuth code from mobile app and links Google Calendar account
 */

const { GoogleAccountNotLinkedError } = require('../errors');

class CompleteGoogleOAuthUseCase {
  constructor({
    userRepository,
    googleCalendarAdapter,
    calendarSyncAdapter
  }) {
    this.userRepository = userRepository;
    this.googleCalendarAdapter = googleCalendarAdapter;
    this.calendarSyncAdapter = calendarSyncAdapter;
  }

  /**
   * Execute complete OAuth flow
   * @param {string} code - OAuth authorization code from Google (received by mobile app)
   * @param {string} state - State parameter from OAuth callback (received by mobile app)
   * @param {string} mobileRedirectUri - Mobile redirect URI used in OAuth flow (must match)
   * @returns {Promise<Object>} Result
   */
  async execute(code, state, mobileRedirectUri) {
    if (!code) {
      throw new Error('OAuth code is required');
    }

    if (!state) {
      throw new Error('State parameter is required for security');
    }

    if (!mobileRedirectUri) {
      throw new Error('Mobile redirect URI is required');
    }

    // Extract userId from state parameter
    // State format: "randomHex:userId"
    const { userId } = this.googleCalendarAdapter.extractOAuthState(state);

    // Get user
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Exchange code for tokens using the mobile redirect URI
    // This must match exactly what was used in generateOAuthUrl
    const tokens = await this.googleCalendarAdapter.exchangeOAuthCallbackCode(code, mobileRedirectUri);

    // Save tokens to user
    await this.googleCalendarAdapter.saveTokensToUser(user, tokens);

    // Refresh user to get updated tokens
    const updatedUser = await this.userRepository.findById(userId);

    // Ensure the Jaaiye calendar exists using fresh tokens
    await this.googleCalendarAdapter.ensureJaaiyeCalendar(updatedUser, tokens);

    // Sync existing events (non-blocking)
    if (this.calendarSyncAdapter) {
      this.calendarSyncAdapter.syncExistingEventsToCalendar(userId).catch(err => {
        console.error('Failed to sync existing events to calendar', {
          userId,
          error: err.message
        });
        // Don't fail the linking process if sync fails
      });
    }

    return {
      message: 'Google Calendar account linked successfully',
      linked: true,
      userId
    };
  }
}

module.exports = CompleteGoogleOAuthUseCase;

