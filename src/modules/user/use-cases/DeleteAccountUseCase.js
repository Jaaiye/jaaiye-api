/**
 * Delete Account Use Case
 * Application layer - use case
 */

const { UserNotFoundError, InvalidPasswordError } = require('../../common/errors');
const { PasswordService } = require('../../common/services');
const TokenBlacklist = require('../../common/entities/TokenBlacklist.schema');

class DeleteAccountUseCase {
  constructor({ userRepository, emailAdapter }) {
    this.userRepository = userRepository;
    this.emailAdapter = emailAdapter;
  }

  /**
   * Execute delete account (soft delete)
   * @param {string} userId - User ID
   * @param {string} password - User password for verification
   * @returns {Promise<void>}
   */
  async execute(userId, password) {
    if (!password) {
      throw new Error('Password is required to deactivate account');
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundError();
    }

    // Verify password
    const isMatch = await PasswordService.compare(password, user.password);
    if (!isMatch) {
      throw new InvalidPasswordError('Invalid password');
    }

    // Get user with refresh token
    const UserSchema = require('../../common/entities/User.schema');
    const userDoc = await UserSchema.findById(userId).select('+refresh.token +refresh.expiresAt');

    // Revoke refresh token if exists
    if (userDoc?.refresh?.token) {
      await TokenBlacklist.create({
        token: userDoc.refresh.token,
        expiresAt: userDoc.refresh.expiresAt || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      });

      // Clear refresh token
      await this.userRepository.update(userId, {
        'refresh.token': undefined,
        'refresh.expiresAt': undefined
      });
    }

    // Soft delete user
    await this.userRepository.update(userId, {
      isDeleted: true,
      deletedAt: new Date(),
      isActive: false
    });

    // Send deactivation email in background
    if (this.emailAdapter) {
      const { emailQueue } = require('../../../../queues');
      emailQueue.sendAccountDeactivationEmailAsync(user.email).catch(err => {
        console.error('Failed to send deactivation email:', err);
      });
    }
  }
}

module.exports = DeleteAccountUseCase;

