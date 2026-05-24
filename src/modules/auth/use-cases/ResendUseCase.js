/**
 * Resend Use Case
 * Handles resending verification or reset codes.
 * All codes written to Redis.
 */

const { ValidationError } = require('../errors');
const { NotFoundError, BadRequestError } = require('../../common/errors');
const { PasswordService } = require('../../common/services');

class ResendUseCase {
  constructor({ userRepository, emailService, emailQueue, notificationQueue, redisAuthService }) {
    this.userRepository = userRepository;
    this.emailService = emailService;
    this.emailQueue = emailQueue;
    this.notificationQueue = notificationQueue;
    this.redisAuthService = redisAuthService;
  }

  /**
   * Execute resend
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

  /** @private */
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

    const verificationCode = PasswordService.generateVerificationCode();

    // Store in Redis — 10-minute TTL (overwrites any existing code)
    await this.redisAuthService.storeVerifyCode(user.id, verificationCode, 10 * 60);

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

  /** @private */
  async _resendReset(email) {
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      return {
        success: true,
        message: 'If an account with this email exists, a reset code has been sent',
        data: null
      };
    }

    const resetCode = PasswordService.generateResetCode();

    // Store in Redis — 1-hour TTL (overwrites any existing code)
    await this.redisAuthService.storeResetCode(user.id, resetCode, 60 * 60);

    this._sendResetEmail(user, resetCode).catch(err => {
      console.error('Failed to send reset email:', err);
    });

    return {
      success: true,
      message: 'If an account with this email exists, a reset code has been sent',
      data: null
    };
  }

  /** @private */
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

module.exports = ResendUseCase;
