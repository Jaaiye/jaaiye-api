/**
 * Resend Use Case
 * Handles resending verification or reset codes
 * Combined endpoint matching legacy behavior
 */

const { ValidationError } = require('../errors');
const { NotFoundError, BadRequestError } = require('../../common/errors');
const { PasswordService } = require('../../common/services');

class ResendUseCase {
  constructor({ userRepository, emailService, emailQueue, notificationQueue }) {
    this.userRepository = userRepository;
    this.emailService = emailService;
    this.emailQueue = emailQueue;
    this.notificationQueue = notificationQueue;
  }

  /**
   * Execute resend (verification or reset)
   * @param {string} email - User email
   * @param {string} type - "verification" or "reset"
   * @returns {Promise<Object>} { success, message, data }
   */
  async execute(email, type) {
    if (!email || !type) {
      throw new ValidationError('Email and type are required');
    }

    const lowerType = String(type).toLowerCase();
    if (!['verification', 'reset'].includes(lowerType)) {
      throw new ValidationError('type must be either "verification" or "reset"');
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (lowerType === 'verification') {
      return await this._resendVerification(normalizedEmail);
    } else {
      return await this._resendReset(normalizedEmail);
    }
  }

  /**
   * Resend verification code
   * @private
   */
  async _resendVerification(email) {
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.emailVerified) {
      return {
        success: true,
        message: 'Email already verified',
        data: null
      };
    }

    // Generate new verification code
    const verificationCode = PasswordService.generateVerificationCode();
    const codeExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Update verification code
    await this.userRepository.setVerificationCode(user.id, verificationCode, codeExpiry);

    // Send verification email (async)
    this._sendVerificationEmail(user, verificationCode).catch(err => {
      console.error('Failed to send verification email:', err);
    });

    return {
      success: true,
      message: 'Verification email sent',
      data: {
        email: user.email,
        expiresIn: '10 minutes'
      }
    };
  }

  /**
   * Resend reset code
   * @private
   */
  async _resendReset(email) {
    const user = await this.userRepository.findByEmail(email);

    // Don't reveal if user exists (security)
    if (!user) {
      return {
        success: true,
        message: 'If an account with this email exists, a reset code has been sent',
        data: null
      };
    }

    // Generate new reset code
    const resetCode = PasswordService.generateResetCode();
    const codeExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Update reset code
    await this.userRepository.setResetPasswordCode(user.id, resetCode, codeExpiry);

    // Send reset email (async)
    this._sendResetEmail(user, resetCode).catch(err => {
      console.error('Failed to send reset email:', err);
    });

    return {
      success: true,
      message: 'If an account with this email exists, a reset code has been sent',
      data: null
    };
  }

  /**
   * Send verification email
   * @private
   */
  async _sendVerificationEmail(user, code) {
    if (this.emailQueue) {
      await this.emailQueue.sendVerificationEmailAsync(
        user.email,
        code,
        user.fullName || 'User'
      );
    } else if (this.emailService) {
      await this.emailService.sendVerificationEmail({
        to: user.email,
        name: user.fullName,
        code
      });
    }
  }

  /**
   * Send reset email
   * @private
   */
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

module.exports = ResendUseCase;

