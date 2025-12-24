/**
 * Initiate Google OAuth Use Case
 * Application layer - use case
 * Generates OAuth URL for Google Calendar linking
 */

class InitiateGoogleOAuthUseCase {
  constructor({ googleCalendarAdapter }) {
    this.googleCalendarAdapter = googleCalendarAdapter;
  }

  /**
   * Execute initiate Google OAuth
   * @param {string} userId - User ID
   * @param {string} redirectUri - Callback redirect URI (must match Google Cloud Console)
   * @param {string} mobileRedirectUri - Optional mobile app deep link for redirect after OAuth
   * @returns {Promise<Object>} { url: string, state: string }
   */
  async execute(userId, redirectUri, mobileRedirectUri = null) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    if (!redirectUri) {
      throw new Error('Redirect URI is required');
    }

    // Generate OAuth URL with state parameter (includes mobileRedirectUri if provided)
    const { url, state } = this.googleCalendarAdapter.generateOAuthUrl(userId, redirectUri, mobileRedirectUri);

    return {
      authUrl: url,
      state: state // Frontend should store this temporarily for state validation
    };
  }
}

module.exports = InitiateGoogleOAuthUseCase;

