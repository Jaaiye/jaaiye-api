/**
 * Get Diagnostics Use Case
 * Application layer - use case
 */

class GetDiagnosticsUseCase {
  constructor({ userRepository }) {
    this.userRepository = userRepository;
  }

  /**
   * Execute get diagnostics
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Diagnostics data
   */
  async execute(userId) {
    const diagnostics = {
      environment: process.env.NODE_ENV || 'development',
      googleClientId: !!process.env.GOOGLE_CLIENT_ID,
      googleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      googleRedirectUri: !!process.env.GOOGLE_REDIRECT_URI,
      googleWebhookUrl: !!process.env.GOOGLE_WEBHOOK_URL,
      timestamp: new Date().toISOString()
    };

    // Check user's Google Calendar status
    const user = await this.userRepository.findById(userId);
    if (user?.googleCalendar) {
      diagnostics.userStatus = {
        hasRefreshToken: !!user.googleCalendar.refreshToken,
        hasAccessToken: !!user.googleCalendar.accessToken,
        hasExpiryDate: !!user.googleCalendar.expiryDate,
        hasScope: !!user.googleCalendar.scope,
        isExpired: user.googleCalendar.expiryDate ?
          new Date() >= new Date(user.googleCalendar.expiryDate) : true
      };
    } else {
      diagnostics.userStatus = {
        hasRefreshToken: false,
        hasAccessToken: false,
        hasExpiryDate: false,
        hasScope: false,
        isExpired: true
      };
    }

    return diagnostics;
  }
}

module.exports = GetDiagnosticsUseCase;

