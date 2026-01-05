/**
 * Handle OAuth Redirect Use Case
 * Application layer - use case
 * Processes OAuth callback from Google and returns redirect information for mobile app
 */

const { GoogleAccountNotLinkedError } = require('../errors');

class HandleOAuthRedirectUseCase {
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
   * Execute handle OAuth redirect
   * @param {string} code - OAuth authorization code from Google
   * @param {string} state - State parameter from OAuth callback
   * @param {string} backendRedirectUri - Backend redirect URI used in OAuth flow (must match)
   * @returns {Promise<Object>} Result with mobileRedirectUri for redirect
   */
  async execute(code, state, backendRedirectUri) {
    if (!code) {
      throw new Error('OAuth code is required');
    }

    if (!state) {
      throw new Error('State parameter is required for security');
    }

    if (!backendRedirectUri) {
      throw new Error('Backend redirect URI is required');
    }

    // Extract userId and mobileRedirectUri from state parameter
    // State format: "randomHex:userId:base64EncodedMobileRedirectUri"
    const { userId, mobileRedirectUri } = this.googleCalendarAdapter.extractOAuthState(state);

    if (!mobileRedirectUri) {
      throw new Error('Mobile redirect URI not found in state parameter');
    }

    // Get user
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Exchange code for tokens using the backend redirect URI
    // This must match exactly what was used in generateOAuthUrl
    const tokens = await this.googleCalendarAdapter.exchangeOAuthCallbackCode(code, backendRedirectUri);

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
      userId,
      mobileRedirectUri // Return for redirect
    };
  }
}

module.exports = HandleOAuthRedirectUseCase;

