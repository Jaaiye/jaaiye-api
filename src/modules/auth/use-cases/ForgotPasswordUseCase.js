/**
 * Forgot Password Use Case
 * Writes reset code to Redis (not DB).
 */

const { ValidationError } = require('../errors');
const { NotFoundError } = require('../../common/errors');
const { PasswordService } = require('../../common/services');

class ForgotPasswordUseCase {
  constructor({ userRepository, emailService, emailQueue, notificationQueue, redisAuthService }) {
    this.userRepository = userRepository;
    this.emailService = emailService;
    this.emailQueue = emailQueue;
    this.notificationQueue = notificationQueue;
    this.redisAuthService = redisAuthService;
  }

  /**
   * Execute forgot password
   * @param {string} email - User email
   * @returns {Promise<Object>} { success, message }
   */
  async execute(email) {
    if (!email) {
      throw new ValidationError('Email is required');
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await this.userRepository.findByEmail(normalizedEmail);
    if (!user) {
      // Don't reveal whether email exists
      return {
        success: true,
        message: 'If the email exists, a reset code will be sent'
      };
    }

    const resetCode = PasswordService.generateResetCode();

    // Store reset code in Redis — 1 hour TTL
    await this.redisAuthService.storeResetCode(user.id, resetCode, 60 * 60);

    // Send reset email (async, non-blocking)
    this._sendResetEmail(user, resetCode).catch(err => {
      console.error('Failed to send reset email:', err);
    });

    return {
      success: true,
      message: 'If the email exists, a reset code will be sent'
    };
  }

  /** @private */
  async _sendResetEmail(user, code) {
    if (this.emailQueue) {
      await this.emailQueue.sendPasswordResetEmailAsync(
        user.email,
        code,
        user.fullName || 'User'
      );
    } else if (this.emailService) {
      await this.emailService.sendPasswordResetEmail({
        to: user.email,
        name: user.fullName,
        code
      });
    }
  }
}

module.exports = ForgotPasswordUseCase;
