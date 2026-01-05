/**
 * Verify Email Use Case
 * Handles email verification business logic
 */

const { ValidationError } = require('../errors');
const { NotFoundError, BadRequestError } = require('../../common/errors');
const { TokenService } = require('../../common/services');
const { UserEntity } = require('../../common/entities');
const { addDaysToNow } = require('../../../utils/dateUtils');

class VerifyEmailUseCase {
  constructor({ userRepository, firebaseAdapter, emailService, emailQueue, notificationQueue }) {
    this.userRepository = userRepository;
    this.firebaseAdapter = firebaseAdapter;
    this.emailService = emailService;
    this.emailQueue = emailQueue;
    this.notificationQueue = notificationQueue;
  }

  /**
   * Execute email verification
   * @param {string} userId - User ID (optional, can find by code)
   * @param {string} code - Verification code
   * @returns {Promise<Object>} { accessToken, refreshToken, firebaseToken, user }
   */
  async execute(userId, code) {
    if (!code) {
      throw new ValidationError('Verification code is required');
    }

    // Find user by code (legacy supports finding by code alone)
    let user = await this.userRepository.findByVerificationCode(code);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Debug: Log verification object
    if (process.env.NODE_ENV === 'development') {
      console.log('VerifyEmail - User verification object:', {
        hasVerification: !!user.verification,
        verification: user.verification,
        code: user.verification?.code,
        expires: user.verification?.expires,
        expiresType: typeof user.verification?.expires,
        expiresValue: user.verification?.expires ? new Date(user.verification.expires).toISOString() : null,
        now: new Date().toISOString()
      });
    }

    // Check if already verified
    if (user.emailVerified) {
      throw new BadRequestError('Email already verified');
    }

    // Check if verification object exists
    if (!user.verification || !user.verification.code) {
      throw new BadRequestError('No verification code found. Please request a new verification code.');
    }

    // Create user entity to check business rules
    let userEntity = user instanceof UserEntity ? user : new UserEntity(user);

    // Check if verification code is valid
    if (!userEntity.hasValidVerificationCode()) {
      throw new BadRequestError('Verification code has expired');
    }

    // Verify code matches
    if (user.verification.code !== code) {
      throw new BadRequestError('Invalid verification code');
    }

    // Mark email as verified and clear verification data
    await this.userRepository.markEmailVerified(user.id);

    // Send welcome email (async, non-blocking)
    this._sendWelcomeEmail(user).catch(err => {
      console.error('Failed to send welcome email:', err);
    });

    // Update entity state locally
    userEntity.emailVerified = true;
    userEntity.verification = undefined;
    userEntity.updatedAt = new Date();

    // Generate tokens (after verification, user can login)
    const accessToken = TokenService.generateAccessToken(userEntity);
    const refreshToken = TokenService.generateRefreshToken(userEntity.id);
    const firebaseToken = this.firebaseAdapter
      ? await this.firebaseAdapter.generateToken(userEntity.id)
      : null;

    // Save refresh token to user
    const refreshExpiry = addDaysToNow(90); // 90 days from now (UTC)
    await this.userRepository.updateRefreshData(userEntity.id, {
      refreshToken,
      firebaseToken,
      refreshExpiry
    });

    return {
      accessToken,
      refreshToken,
      firebaseToken,
      user: userEntity
    };
  }

  /**
   * Send welcome email (private helper)
   * @private
   */
  async _sendWelcomeEmail(user) {
    if (this.emailQueue) {
      await this.emailQueue.sendWelcomeEmailAsync(
        user.email,
        user.username || user.fullName || 'User'
      );
    } else if (this.emailService) {
      await this.emailService.sendWelcomeEmail({
        to: user.email,
        name: user.username
      });
    }
  }

  /**
   * Resend verification email
   * @param {string} userId - User ID
   * @returns {Promise<Object>} { success, message }
   */
  async resend(userId, { emailService, emailQueue, notificationQueue }) {
    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    // Find user
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Check if already verified
    if (user.emailVerified) {
      throw new BadRequestError('Email already verified');
    }

    // Generate new verification code
    const { PasswordService } = require('../../common/services');
    const { addDaysToNow } = require('../../../utils/dateUtils');
    const verificationCode = PasswordService.generateVerificationCode();
    const codeExpiry = addDaysToNow(1); // 24 hours from now (UTC)

    // Update verification code
    await this.userRepository.setVerificationCode(userId, verificationCode, codeExpiry);

    // Send verification email (async)
    this._sendVerificationEmail(user, verificationCode, { emailService, emailQueue, notificationQueue })
      .catch(err => {
        console.error('Failed to send verification email:', err);
      });

    return {
      success: true,
      message: 'Verification email sent'
    };
  }

  /**
   * Send verification email (private helper)
   * @private
   */
  async _sendVerificationEmail(user, code, { emailService, emailQueue, notificationQueue }) {
    if (emailQueue) {
      await emailQueue.sendVerificationEmailAsync(
        user.email,
        code,
        user.fullName || 'User'
      );
    } else if (emailService) {
      await emailService.sendVerificationEmail({
        to: user.email,
        name: user.fullName,
        code
      });
    }
  }
}

module.exports = VerifyEmailUseCase;

