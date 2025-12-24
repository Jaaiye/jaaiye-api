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
   * @param {string} mobileRedirectUri - Mobile app redirect URI (URL scheme, e.g., jaaiye://oauthredirect)
   * @returns {Promise<Object>} { url: string, state: string }
   */
  async execute(userId, mobileRedirectUri) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    if (!mobileRedirectUri) {
      throw new Error('Mobile redirect URI is required');
    }

    // Backend redirect URI (where Google will redirect)
    // This must match what's configured in Google Cloud Console
    const backendRedirectUri = process.env.GOOGLE_REDIRECT_URI ||
      `${process.env.API_BASE_URL || 'https://api.jaaiye.com'}/oauth/redirect`;

    // Generate OAuth URL with backend redirect URI
    // Google will redirect to backend, backend will redirect to mobile app
    const { url, state } = this.googleCalendarAdapter.generateOAuthUrl(
      userId,
      backendRedirectUri,
      mobileRedirectUri
    );

    return {
      authUrl: url,
      state: state // Mobile app should store this temporarily for state validation
    };
  }
}

module.exports = InitiateGoogleOAuthUseCase;

