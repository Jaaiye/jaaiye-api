/**
 * Handle Google OAuth Callback Use Case
 * Application layer - use case
 * Processes OAuth callback and links Google Calendar account
 */

const { GoogleAccountNotLinkedError } = require('../errors');

class HandleGoogleOAuthCallbackUseCase {
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
   * Execute handle OAuth callback
   * @param {string} code - OAuth authorization code from Google
   * @param {string} state - State parameter from OAuth callback
   * @param {string} redirectUri - Redirect URI used in OAuth flow
   * @returns {Promise<Object>} Result
   */
  async execute(code, state, redirectUri = null) {
    if (!code) {
      throw new Error('OAuth code is required');
    }

    if (!state) {
      throw new Error('State parameter is required for security');
    }

    // Extract userId, redirectUri, and mobileRedirectUri from state parameter
    // State format: "randomHex:userId:base64EncodedRedirectUri:base64EncodedMobileRedirectUri" (new with mobile)
    // State format: "randomHex:userId:base64EncodedRedirectUri" (legacy)
    // State format: "randomHex:userId" (very old)
    const { userId, redirectUri: extractedRedirectUri, mobileRedirectUri } = this.googleCalendarAdapter.extractOAuthState(state);

    // Use redirectUri from state if provided, otherwise use the one passed as parameter
    // For legacy state format, we need redirectUri as parameter
    const finalRedirectUri = extractedRedirectUri || redirectUri;

    if (!finalRedirectUri) {
      throw new Error('Redirect URI is required. For legacy OAuth flows, please provide redirectUri as a query parameter. For new flows, it\'s included in the state parameter.');
    }

    console.log('[OAuth Callback] Using redirectUri:', {
      fromState: !!extractedRedirectUri,
      fromParameter: !!redirectUri,
      finalRedirectUri,
      hasMobileRedirect: !!mobileRedirectUri,
      stateFormat: state.split(':').length >= 4 ? 'new-with-mobile' : state.split(':').length >= 3 ? 'new' : 'legacy'
    });

    // Get user
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Exchange code for tokens (direct Google OAuth, not Firebase)
    const tokens = await this.googleCalendarAdapter.exchangeOAuthCallbackCode(code, finalRedirectUri);

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

    // Return result with mobileRedirectUri if present (for HTML redirect)
    return {
      message: 'Google Calendar account linked successfully',
      linked: true,
      userId,
      mobileRedirectUri: mobileRedirectUri || null
    };
  }
}

module.exports = HandleGoogleOAuthCallbackUseCase;

