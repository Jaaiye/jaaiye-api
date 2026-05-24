/**
 * Logout Use Case
 * Blacklists the access token and removes the refresh session from Redis.
 */

const { TokenService } = require('../../common/services');

class LogoutUseCase {
  constructor({ tokenBlacklistRepository, redisAuthService }) {
    this.tokenBlacklistRepository = tokenBlacklistRepository;
    this.redisAuthService = redisAuthService;
  }

  /**
   * Execute logout
   * @param {string} accessToken - Current access token (to blacklist)
   * @param {string} [refreshToken] - Current refresh token (to remove session)
   * @returns {Promise<Object>} { success, message }
   */
  async execute(accessToken, refreshToken) {
    const tasks = [];

    // Blacklist access token
    if (accessToken) {
      tasks.push(this.tokenBlacklistRepository.add(accessToken, null));
    }

    // Remove refresh session from Redis
    if (refreshToken) {
      const decoded = TokenService.decodeWithoutVerify(refreshToken);
      if (decoded?.id && decoded?.jti) {
        tasks.push(this.redisAuthService.deleteRefreshToken(decoded.id, decoded.jti));
      }
    }

    await Promise.all(tasks);

    return {
      success: true,
      message: 'Logged out successfully'
    };
  }

  /**
   * Logout from all devices — removes all refresh sessions for a user.
   * @param {string} userId
   * @param {string} [currentAccessToken] - Blacklist current access token too
   * @returns {Promise<Object>}
   */
  async executeAll(userId, currentAccessToken) {
    const tasks = [
      this.redisAuthService.deleteAllRefreshTokens(userId)
    ];

    if (currentAccessToken) {
      tasks.push(this.tokenBlacklistRepository.add(currentAccessToken, null));
    }

    await Promise.all(tasks);

    return {
      success: true,
      message: 'Logged out from all devices'
    };
  }
}

module.exports = LogoutUseCase;
