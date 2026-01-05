/**
 * Logout Use Case
 * Application layer - use case
 */

const { UserNotFoundError } = require('../../common/errors');
const TokenBlacklist = require('../../common/entities/TokenBlacklist.schema');

class LogoutUseCase {
  constructor({ userRepository, notificationAdapter }) {
    this.userRepository = userRepository;
    this.notificationAdapter = notificationAdapter;
  }

  /**
   * Execute logout
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async execute(userId) {
    const UserSchema = require('../../common/entities/User.schema');
    const userDoc = await UserSchema.findById(userId).select('+refresh.token +refresh.expiresAt');

    if (!userDoc) {
      throw new UserNotFoundError();
    }

    // If no refresh token, user already logged out (legacy behavior - return success)
    if (!userDoc.refresh?.token) {
      return; // Already logged out - return success
    }

    // Blacklist refresh token
    await TokenBlacklist.create({
      token: userDoc.refresh.token,
      expiresAt: userDoc.refresh.expiresAt || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
    });

    // Clear refresh token from user
    await this.userRepository.update(userId, {
      'refresh.token': undefined,
      'refresh.expiresAt': undefined
    });

    // Send notification in background
    if (this.notificationAdapter) {
      this.notificationAdapter.send(userId, {
        title: 'Security Alert',
        body: 'You have been logged out',
        data: { type: 'logout' }
      }).catch(err => {
        console.error('Failed to send notification:', err);
      });
    }
  }
}

module.exports = LogoutUseCase;

