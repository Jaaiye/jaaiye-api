/**
 * Forgot Password Use Case
 * Handles password reset request
 */

const { ValidationError } = require('../errors');
const { NotFoundError } = require('../../common/errors');
const { PasswordService } = require('../../common/services');

class ForgotPasswordUseCase {
  constructor({ userRepository, emailService, notificationQueue }) {
    this.userRepository = userRepository;
    this.emailService = emailService;
    this.notificationQueue = notificationQueue;
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

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Find user
    const user = await this.userRepository.findByEmail(normalizedEmail);
    if (!user) {
      // Don't reveal if email exists or not (security)
      return {
        success: true,
        message: 'If the email exists, a reset code will be sent'
      };
    }

    // Generate reset code
    const resetCode = PasswordService.generateResetCode();
    const codeExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save reset code
    await this.userRepository.setResetPasswordCode(user.id, resetCode, codeExpiry);

    // Send reset email (async, non-blocking)
    this._sendResetEmail(user, resetCode).catch(err => {
      console.error('Failed to send reset email:', err);
    });

    return {
      success: true,
      message: 'If the email exists, a reset code will be sent'
    };
  }

  /**
   * Send reset email (private helper)
   * @private
   */
  async _sendResetEmail(user, code) {
    if (this.notificationQueue) {
      await this.notificationQueue.add('send-reset-password-email', {
        userId: user.id,
        email: user.email,
        fullName: user.fullName,
        resetCode: code
      });
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

