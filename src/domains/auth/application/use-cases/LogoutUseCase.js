/**
 * Logout Use Case
 * Handles user logout and token blacklisting
 */

const { TokenService } = require('../../../shared/domain/services');

class LogoutUseCase {
  constructor({ tokenBlacklistRepository }) {
    this.tokenBlacklistRepository = tokenBlacklistRepository;
  }

  /**
   * Execute logout (blacklist token)
   * @param {string} token - JWT token
   * @returns {Promise<Object>} { success, message }
   */
  async execute(token) {
    if (!token) {
      return {
        success: true,
        message: 'Logged out successfully'
      };
    }

    // Get token expiration
    const expiresAt = TokenService.getExpirationDate(token);

    if (expiresAt) {
      // Add to blacklist
      await this.tokenBlacklistRepository.add(token, expiresAt);
    }

    return {
      success: true,
      message: 'Logged out successfully'
    };
  }
}

module.exports = LogoutUseCase;

